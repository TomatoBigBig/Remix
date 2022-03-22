import bcrypt from "bcryptjs"
import {
    createCookieSessionStorage,
    redirect,
} from "remix";

import { db } from "./db.server"
// 登录表单数据类型
type LoginForm = {
    username: string;
    password: string
}


export async function register({
    username,
    password
}:LoginForm) {
    // 处理表单数据中的密码使其哈希化加密
    const passwordHash = await bcrypt.hash(password, 10)
    // 存入用户账号密码
    const user = await db.user.create({
        data:{username, passwordHash}
    })
    // 返回用户id和用户名
    return { id:user.id, username }
}

export async function login({
    username,
    password,
}:LoginForm) {
    // 查找数据库 是否存在此用户名
    const user = await db.user.findUnique({
        where: { username }
    })
    // 如果不存在 返回空值
    if(!user) return null;
    // 验证密码
    const isCorrectPassword = await bcrypt.compare(
        password,
        user.passwordHash
    )
    // 如果返回false 则密码错误 返回flase
    if(!isCorrectPassword) return null;
    
    // 以上全部成功 返回用户id 和 用户名
    return { id: user.id, username }
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}


// 创建一个session存储对象
const storage = createCookieSessionStorage({
    cookie: {
      name: "RJ_session",
      // normally you want this to be `secure: true`
      // but that doesn't work on localhost for Safari
      // https://web.dev/when-to-use-local-https/
      secure: process.env.NODE_ENV === "production",
      secrets: [sessionSecret],
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
    },
});
// 获取用户session
function getUserSession(request: Request) {
    return storage.getSession(request.headers.get("Cookie"));
}
// 获取用户id
export async function getUserId(request: Request) {
    const session = await getUserSession(request);
    const userId = session.get("userId");
    if (!userId || typeof userId !== "string") return null;
    return userId;
}
// 判断是否已经登录 如果已经登录 会返回一个userid 反之则跳转登录页面
export async function requireUserId(
    request: Request,
    redirectTo: string = new URL(request.url).pathname
) {
    const session = await getUserSession(request);
    const userId = session.get("userId");
    if (!userId || typeof userId !== "string") {
      const searchParams = new URLSearchParams([
        ["redirectTo", redirectTo],
      ]);
      throw redirect(`/login?${searchParams}`);
    }
    return userId;
}
// 从数据库中获取用户信息
export async function getUser(request: Request) {
    const userId = await getUserId(request);
    if (typeof userId !== "string") {
      return null;
    }
    
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      });
      return user;
    } catch {
      throw logout(request);
    }
}
// 退出登录
export async function logout(request: Request) {
    const session = await getUserSession(request);
    return redirect("/login", {
      headers: {
        "Set-Cookie": await storage.destroySession(session),
      },
    });
}

export async function createUserSession(
    userId: string,
    redirectTo: string
  ) {
    // 拿到session对象
    const session = await storage.getSession();
    // 将用户id存入session
    session.set("userId", userId);
    // 重定向 并将session存入cookie
    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": await storage.commitSession(session),
      },
    });
}