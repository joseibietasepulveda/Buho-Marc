import {NextResponse,type NextRequest} from 'next/server';
// Only admin pages need this marker; ordinary application/API processes bypass this proxy.
export function proxy(request:NextRequest){const headers=new Headers(request.headers);headers.set('x-buho-admin-route','1');return NextResponse.next({request:{headers}});}
export const config={matcher:['/app/admin/:path*']};
