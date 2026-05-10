"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const emailRef = React.useRef<HTMLInputElement | null>(null);
  const passwordRef = React.useRef<HTMLInputElement | null>(null);

  const submit = async () => {
    setError("");
    const nextEmail = emailRef.current?.value ?? email;
    const nextPassword = passwordRef.current?.value ?? password;
    if (!nextEmail.trim() || !nextPassword) {
      setError("请输入邮箱和密码");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("未配置 Supabase 环境变量");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email: nextEmail.trim(), password: nextPassword });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>使用 Supabase Auth 账号登录</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">邮箱</div>
            <Input
              ref={emailRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="name@company.com"
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">密码</div>
            <Input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <div className="text-sm text-rose-700 dark:text-rose-400">{error}</div> : null}
          <Button onClick={() => void submit()} disabled={loading}>
            登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
