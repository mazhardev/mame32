import{expect,it}from'vitest';import{deal,draw,move,validSave}from'./engine';
it('deals all 52 cards exactly once with correct exposed tops',()=>{const s=deal();expect(s.stock).toHaveLength(24);expect(validSave(s)).toBe(true);expect(s.tableau.map(p=>p.length)).toEqual([1,2,3,4,5,6,7]);});
it('recycles waste in the original draw order',()=>{let s=deal();const first=s.stock[s.stock.length-1].id;for(let i=0;i<24;i++)s=draw(s);s=draw(s);s=draw(s);expect(s.waste[0].id).toBe(first);expect(validSave(s)).toBe(true);});
it('rejects moving hidden cards or a card onto itself',()=>{const s=deal();expect(move(s,{kind:'tableau',pile:1,index:0},{kind:'tableau',pile:2})).toBeNull();expect(move(s,{kind:'tableau',pile:0,index:0},{kind:'tableau',pile:0})).toBeNull();});
it('rejects a duplicated card in a save',()=>{const s=deal();s.stock[0]=s.stock[1];expect(validSave(s)).toBe(false);});
