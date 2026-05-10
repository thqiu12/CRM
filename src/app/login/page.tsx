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

  const submit = async () => {
    setError("");
    if (!isSupabaseConfigured()) {
      setError("未配置 Supabase 环境变量");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">密码</div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error ? <div className="text-sm text-rose-700 dark:text-rose-400">{error}</div> : null}
          <Button onClick={() => void submit()} disabled={loading || !email.trim() || !password}>
            登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

