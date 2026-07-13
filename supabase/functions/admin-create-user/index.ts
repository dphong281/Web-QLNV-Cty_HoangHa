// supabase/functions/admin-create-user/index.ts
// ============================================================
// Edge Function: admin-create-user
// Xử lý 3 thao tác quản trị tài khoản, dùng chung 1 endpoint qua field "action":
//   - action = "create"         : tạo tài khoản mới
//       + Admin: tạo BẤT KỲ tài khoản nào (kể cả Admin khác)
//       + Trưởng phòng: CHỈ tạo được tài khoản (không phải Admin)
//         trong CÙNG phòng ban của họ
//   - action = "toggle_active"  : khóa / mở khóa tài khoản
//       + Admin: khóa/mở BẤT KỲ tài khoản nào
//       + Trưởng phòng: CHỈ khóa/mở được nhân viên CÙNG phòng ban,
//         không tự khóa chính mình, không đụng được tài khoản Admin
//   - action = "reset_password" : đặt lại mật khẩu người khác (CHỈ Admin)
//
// Đổi mật khẩu CỦA CHÍNH MÌNH không đi qua function này - dùng thẳng
// supabase.auth.update_user() ở phía client với session hiện tại.
//
// SERVICE_ROLE_KEY chỉ tồn tại ở đây (server), không lộ ra app desktop.
//
// LUU Y (07/2026): Supabase da doi sang he thong key moi (sb_publishable_...
// / sb_secret_...), thay cho anon/service_role key kieu JWT cu. 2 bien moi
// nay la JSON dictionary (khong phai chuoi don gian nhu truoc), phai
// JSON.parse() roi lay theo ten key (thuong la 'default'). Neu du an cua
// ban van dung anon/service_role kieu cu, doi lai thanh:
//   const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
//   const SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
//   const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEYS = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
const SUPABASE_PUBLISHABLE_KEYS = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);
const SECRET_KEY = SUPABASE_SECRET_KEYS["default"];
const PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEYS["default"];

const PHONG_BAN_CHUC_VU: Record<string, string[]> = {
  hanh_chinh: ["truong_phong_hanh_chinh", "nhan_vien_hanh_chinh"],
  ke_toan: ["ke_toan_truong", "ke_toan_vien"],
  khai_thac: ["truong_phong_khai_thac", "nhan_vien_khai_thac"],
  cua_hang: ["truong_ca_cua_hang", "nhan_vien_cua_hang"],
};

// Danh sach chuc vu duoc coi la "Truong phong" cua tung phong ban
const TRUONG_PHONG_CHUC_VU = [
  "truong_phong_hanh_chinh",
  "ke_toan_truong",
  "truong_phong_khai_thac",
  "truong_ca_cua_hang",
];

// CORS - BẮT BUỘC vì function này giờ được gọi từ trình duyệt (web app),
// khác với trước đây chỉ gọi từ app desktop Python (không bị chặn CORS
// vì CORS chỉ áp dụng cho trình duyệt).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Chỉ hỗ trợ phương thức POST." }, 405);
  }

  // ----------------------------------------------------------
  // Xac thuc nguoi goi (dung chung cho ca 3 action) - CHUA kiem tra
  // quyen han cu the o day nua, vi moi action co dieu kien quyen khac
  // nhau (xem tung khoi action ben duoi).
  // ----------------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  if (!accessToken) {
    return jsonResponse({ error: "Thiếu access token. Vui lòng đăng nhập lại." }, 401);
  }

  const callerClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return jsonResponse({ error: "Access token không hợp lệ hoặc đã hết hạn." }, 401);
  }

  const callerMeta = callerData.user.user_metadata ?? {};
  const callerIsAdmin = callerMeta.is_admin === true;
  const callerIsTruongPhong = TRUONG_PHONG_CHUC_VU.includes(callerMeta.chuc_vu);
  const callerId = callerData.user.id;

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Body request không phải JSON hợp lệ." }, 400);
  }

  const action = payload.action as string | undefined;
  const adminClient = createClient(SUPABASE_URL, SECRET_KEY);

  // ============================================================
  // ACTION: create
  //   - Admin: tao bat ky tai khoan nao (Admin khac, hoac bat ky phong ban)
  //   - Truong phong: CHI tao duoc tai khoan (khong phai Admin) trong
  //     CUNG phong ban cua ho
  // ============================================================
  if (action === "create") {
    if (!callerIsAdmin && !callerIsTruongPhong) {
      return jsonResponse({ error: "Bạn không có quyền tạo tài khoản mới." }, 403);
    }

    const { email, password, ho_ten, is_admin, phong_ban, chuc_vu, ma_cay_xang } = payload as {
      email?: string; password?: string; ho_ten?: string; is_admin?: boolean;
      phong_ban?: string | null; chuc_vu?: string | null; ma_cay_xang?: string | null;
    };

    if (!email || !password) {
      return jsonResponse({ error: "Vui lòng nhập đầy đủ Email và Mật khẩu." }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: "Mật khẩu phải có ít nhất 6 ký tự." }, 400);
    }

    // Truong phong: chan tao Admin, chan tao khac phong ban cua chinh ho
    if (!callerIsAdmin && callerIsTruongPhong) {
      if (is_admin) {
        return jsonResponse({ error: "Bạn không có quyền tạo tài khoản Admin." }, 403);
      }
      if (phong_ban !== callerMeta.phong_ban) {
        return jsonResponse({ error: "Bạn chỉ được tạo tài khoản trong phòng ban của mình." }, 403);
      }
    }

    if (!is_admin) {
      if (!phong_ban || !(phong_ban in PHONG_BAN_CHUC_VU)) {
        return jsonResponse({ error: "Phòng ban không hợp lệ." }, 400);
      }
      if (!chuc_vu || !PHONG_BAN_CHUC_VU[phong_ban].includes(chuc_vu)) {
        return jsonResponse({ error: "Chức vụ không hợp lệ cho phòng ban này." }, 400);
      }
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        ho_ten,
        is_admin: !!is_admin,
        phong_ban: is_admin ? null : phong_ban,
        chuc_vu: is_admin ? null : chuc_vu,
        ma_cay_xang: phong_ban === "cua_hang" ? ma_cay_xang : null,
      },
    });

    if (createError) {
      const msg = createError.message ?? "Không thể tạo tài khoản.";
      const status = msg.toLowerCase().includes("already") ? 409 : 400;
      return jsonResponse({ error: msg }, status);
    }

    return jsonResponse({
      user_id: created.user?.id,
      email: created.user?.email,
      ho_ten, is_admin: !!is_admin,
      phong_ban: is_admin ? null : phong_ban,
      chuc_vu: is_admin ? null : chuc_vu,
      ma_cay_xang,
    });
  }

  // ============================================================
  // ACTION: toggle_active (khóa / mở khóa)
  //   - Admin: khoa/mo bat ky ai
  //   - Truong phong: chi khoa/mo nhan vien CUNG phong ban, khong tu
  //     khoa chinh minh, khong dung duoc vao tai khoan Admin
  // ============================================================
  if (action === "toggle_active") {
    const { user_id, is_active } = payload as { user_id?: string; is_active?: boolean };
    if (!user_id || typeof is_active !== "boolean") {
      return jsonResponse({ error: "Thiếu user_id hoặc is_active." }, 400);
    }

    if (!callerIsAdmin) {
      if (!callerIsTruongPhong) {
        return jsonResponse({ error: "Bạn không có quyền khóa/mở tài khoản." }, 403);
      }
      if (user_id === callerId) {
        return jsonResponse({ error: "Không thể tự khóa/mở tài khoản của chính mình." }, 403);
      }

      const { data: targetRow, error: targetError } = await adminClient
        .from("tai_khoan")
        .select("phong_ban, is_admin")
        .eq("user_id", user_id)
        .single();

      if (targetError || !targetRow) {
        return jsonResponse({ error: "Không tìm thấy tài khoản cần thao tác." }, 404);
      }
      if (targetRow.is_admin) {
        return jsonResponse({ error: "Không thể khóa/mở tài khoản Admin." }, 403);
      }
      if (targetRow.phong_ban !== callerMeta.phong_ban) {
        return jsonResponse({ error: "Bạn chỉ có thể khóa/mở tài khoản trong phòng ban của mình." }, 403);
      }
    }

    const { error: updateError } = await adminClient
      .from("tai_khoan")
      .update({ is_active })
      .eq("user_id", user_id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }

    // Đồng thời khóa luôn ở tầng Supabase Auth để chặn đăng nhập thật sự
    await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: is_active ? "none" : "876000h", // ~100 năm coi như khóa vĩnh viễn
    });

    return jsonResponse({ user_id, is_active });
  }

  // ============================================================
  // ACTION: reset_password - CHI ADMIN (doi mat khau nguoi KHAC)
  // ============================================================
  if (action === "reset_password") {
    if (!callerIsAdmin) {
      return jsonResponse({ error: "Chỉ Admin mới được đặt lại mật khẩu của người khác." }, 403);
    }

    const { user_id, new_password } = payload as { user_id?: string; new_password?: string };
    if (!user_id || !new_password) {
      return jsonResponse({ error: "Thiếu user_id hoặc mật khẩu mới." }, 400);
    }
    if (new_password.length < 6) {
      return jsonResponse({ error: "Mật khẩu phải có ít nhất 6 ký tự." }, 400);
    }

    const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (pwError) {
      return jsonResponse({ error: pwError.message }, 400);
    }

    return jsonResponse({ user_id, success: true });
  }

  return jsonResponse({ error: `Action '${action}' không hợp lệ.` }, 400);
});