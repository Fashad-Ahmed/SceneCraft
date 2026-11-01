import {describe,expect,it} from 'vitest';
import {initialScene,validate} from '../src/domain/geometry';
import {applyMove,operationSchema} from '../src/domain/operations';
const op=(id:'desk'|'bookshelf',x:number,z:number)=>({operation:'move_object' as const,objectId:id,target:{x,z},explanation:'Benchmark proposal'});
describe('geometry enforcement',()=>{
 it('accepts a valid placement',()=>{const result=applyMove(initialScene,op('desk',2.9,-1.95),'retain desk');expect(result.ok).toBe(true);expect(result.corrected).toBe(false);});
 it('corrects a collision or entrance obstruction',()=>{const result=applyMove(initialScene,op('bookshelf',0,3.5),'near door');expect(result.ok).toBe(true);expect(result.corrected).toBe(true);expect(validate(result.after,'bookshelf')).toEqual([]);});
 it('does not move unrelated scene objects',()=>{const result=applyMove(initialScene,op('bookshelf',0,3.5),'near door');expect(result.after.filter(x=>x.id!=='bookshelf')).toEqual(initialScene.filter(x=>x.id!=='bookshelf'));});
 it('does not mutate input',()=>{const before=structuredClone(initialScene);applyMove(initialScene,op('bookshelf',0,3.5),'near door');expect(initialScene).toEqual(before);});
 it('rejects malformed or extraneous model output',()=>{expect(operationSchema.safeParse({...op('desk',2,-2),malicious:true}).success).toBe(false);expect(operationSchema.safeParse(op('desk',Infinity,-2)).success).toBe(false);});
});
