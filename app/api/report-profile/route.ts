import { NextResponse } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { getSql } from '@/db';
import { withSession } from '@/lib/auth';
import { actorId, organizationId } from '@/lib/tenant-context';
import { reportProfileSchema } from '@/lib/report-profile';
import { sourceError } from '@/lib/source-api';
import { BodyLimitError, boundedJson } from '@/lib/bounded-json';
export const runtime='nodejs';
export const GET=withSession(async()=>{
  try {
    const [row]=await getSql()`SELECT report_profile, report_profile_version FROM organizations WHERE id=${organizationId()}`;
    return NextResponse.json({profile:reportProfileSchema.parse(row.report_profile),version:row.report_profile_version});
  } catch(error){return sourceError(error);}
});
const inputSchema=z.object({profile:reportProfileSchema,version:z.number().int().nonnegative()}).strict();
export const PUT=withSession(async request=>{
  try {
    const {profile,version}=inputSchema.parse(await boundedJson(request,1600000));
    if(profile.logo){
      const bytes=Buffer.from(profile.logo.split(',')[1],'base64');
      if(bytes.length>1024*1024)return NextResponse.json({message:'El logo debe pesar hasta 1 MiB.'},{status:413});
      try {
        const image=sharp(bytes,{limitInputPixels:20000000});const metadata=await image.metadata();
        if(!['png','jpeg','webp'].includes(metadata.format??'')||!metadata.width||!metadata.height)throw new Error();
        const normalized=await image.rotate().resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).png().toBuffer();
        if(normalized.length>1024*1024)throw new Error();
        profile.logo=`data:image/png;base64,${normalized.toString('base64')}`;
      }catch{return NextResponse.json({message:'Usa un logo PNG, JPEG o WebP válido de hasta 1 MiB.'},{status:422});}
    }
    const outcome=await getSql().begin(async tx=>{
      const [current]=await tx`SELECT report_profile, report_profile_version FROM organizations WHERE id=${organizationId()} FOR UPDATE`;
      if(current.report_profile_version!==version)return {status:409,body:{message:'Otro usuario editó los datos del estudio. Cierra y vuelve a abrir para revisar la versión actual.',profile:current.report_profile,version:current.report_profile_version}};
      await tx`UPDATE organizations SET report_profile=${tx.json(profile)},report_profile_version=report_profile_version+1,updated_at=now() WHERE id=${organizationId()}`;
      await tx`INSERT INTO audit_events (organization_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) VALUES (${organizationId()},${actorId()},'report_profile.updated','organization',${organizationId()},${tx.json({...current.report_profile,logo:current.report_profile.logo?'Logo guardado':''})},${tx.json({...profile,logo:profile.logo?'Logo guardado':''})})`;
      return {status:200,body:{profile,version:version+1}};
    });return NextResponse.json(outcome.body,{status:outcome.status});
  }catch(error){
    if(error instanceof BodyLimitError)return NextResponse.json({message:'El logo debe pesar hasta 1 MiB.'},{status:413});
    if(error instanceof SyntaxError)return NextResponse.json({message:'Los datos del estudio no son válidos.'},{status:400});
    return sourceError(error);
  }
});
