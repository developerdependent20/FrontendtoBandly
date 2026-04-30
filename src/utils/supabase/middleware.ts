import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh the session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard, admin, and course routes
  const isProtectedPath = ['/dashboard', '/admin', '/course'].some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in, restrict them from seeing the login page again
  // EXCEPCIÓN: Si están en /reset-password, NO redirigir (necesitan estar ahí para cambiar la clave)
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard' 
    return NextResponse.redirect(url)
  }

  // Asegurar que si están en reset-password y están logueados (lo cual es normal tras el link), no sean expulsados
  if (user && request.nextUrl.pathname === '/reset-password') {
    return supabaseResponse
  }

  return supabaseResponse
}
