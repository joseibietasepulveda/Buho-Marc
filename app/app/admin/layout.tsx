import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {SESSION_COOKIE,sessionIdentity} from '@/lib/auth';
import {workspacePolicy} from '@/lib/workspace-policy';
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const identity=await sessionIdentity((await cookies()).get(SESSION_COOKIE)?.value);
 if(!identity)redirect('/admin/login');
 if(identity.role!=='admin'||!workspacePolicy(identity.organizationSlug,identity.role).sourceAdmin)return <main style={{padding:40,fontFamily:'Arial'}}><h1>Acceso restringido</h1><p>Este dashboard está reservado a la administración de Buho Marc.</p><a href='/app'>Volver a mi espacio</a></main>;
 return children;
}
