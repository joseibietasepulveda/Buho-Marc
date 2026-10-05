import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackRequest,sendWatchFeedback,watchFeedbackInput} from '../lib/watch-feedback.ts';
const row={search_id:'123e4567-e89b-12d3-a456-426614174000',actor_user_id:'human-a',organization_id:'tenant-a',offered_application_id:'1700998',vote:'up',rationale:'Coincide en servicios.'};
test('feedback denotes relevance, preserves source search and isolates the human judge',()=>{
 const value=feedbackRequest(row);assert.equal(value.judge.id,'tenant-a/human-a');assert.equal(value.judgments[0].grade,2);assert.equal(value.judgments[0].application_id,1700998);assert.equal(value.judgments[0].rationale,row.rationale);
 assert.equal(feedbackRequest({...row,vote:'down',rationale:''}).judgments[0].grade,0);assert.equal('rationale' in feedbackRequest({...row,rationale:''}).judgments[0],false);
 assert.equal(watchFeedbackInput.safeParse({matchId:'match',vote:'up',score:1}).success,false);
});
test('sending is confirmed only by the matching search, application and grade',async()=>{
 await sendWatchFeedback(row,async()=>Response.json({search_id:row.search_id,accepted:[{application_id:1700998,grade:2}]}));
 for(const body of [{search_id:row.search_id,accepted:[]},{search_id:row.search_id,accepted:[{application_id:1700998,grade:4}]},{search_id:'123e4567-e89b-12d3-a456-426614174111',accepted:[{application_id:1700998,grade:2}]}])await assert.rejects(sendWatchFeedback(row,async()=>Response.json(body)));
 await assert.rejects(sendWatchFeedback(row,async()=>new Response('',{status:503})));
});
