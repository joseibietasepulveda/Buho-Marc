import test from "node:test";
import assert from "node:assert/strict";
import { clientDataSchema, clientPatchSchema, demoClients, mockClientId, resolveBrandClientId } from "../lib/client-directory.ts";

test("every client field is editable with safe validation", () => {
  const { id, ...client } = demoClients[0];
  for (const [field,value] of Object.entries(client)) {
    assert.equal(clientPatchSchema.safeParse({id,version:1,field,value}).success,true);
    assert.equal(clientDataSchema.safeParse({...client,[field]:value}).success,true);
  }
  for (const patch of [{name:""},{name:"x"},{email:"not-an-email"},{rut:"x".repeat(31)},{phone:"x".repeat(61)}]) assert.equal(clientDataSchema.safeParse({...client,...patch}).success,false);
  assert.equal(clientDataSchema.safeParse({...client,email:""}).success,true);
  assert.equal(clientPatchSchema.safeParse({id,version:0,field:"name",value:"Test"}).success,false);
  assert.equal(clientPatchSchema.safeParse({id,version:1,field:"organizationId",value:"Test"}).success,false);
});
test("real INAPI owners are never assigned a fictitious study", () => {
  const brands = [{id:"mock",name:"NOVA FOODS"},{id:"real",name:"NOVA FOODS",provider:"inapi"}];
  assert.equal(resolveBrandClientId(brands,"NOVA FOODS","mock"),mockClientId("NOVA FOODS"));
  assert.equal(resolveBrandClientId(brands,"NOVA FOODS","real"),undefined);
  assert.equal(resolveBrandClientId(brands,"NOVA FOODS"),undefined);
  assert.equal(resolveBrandClientId(brands,"unknown"),undefined);
});
test("mock links preserve immutable client IDs and duplicate-name relationships", () => {
  const brands = [{id:"1",name:"ACME ANDES"},{id:"2",name:"ACME ANDES"}];
  const id = resolveBrandClientId(brands,"acme andes");
  assert.equal(id,mockClientId("ACME ANDES"));
  const renamed = demoClients.map(client => ({...client,name:"Renamed"}));
  assert.ok(renamed.find(client => client.id === id));
  assert.equal(resolveBrandClientId([{id:"3",name:"Real",provider:"inapi",clientId:"CL-01"}],"Real"),"CL-01");
});
