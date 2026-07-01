import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/shared/supabase/database.types"

// Acessíveis sem sessão e que redirecionam para "/" se o usuário já estiver logado.
const AUTH_ONLY_ROUTES = ["/login", "/cadastro", "/recuperar-senha"]
// Acessíveis sem sessão, mas que NÃO redirecionam usuário logado (ex: troca de senha
// chega com sessão de recovery recém-criada pelo /auth/callback).
const PUBLIC_ROUTES = [
  ...AUTH_ONLY_ROUTES,
  "/atualizar-senha",
  "/auth/callback",
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some((route) => path.startsWith(route))
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) =>
    path.startsWith(route)
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthOnlyRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
