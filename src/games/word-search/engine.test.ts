import{expect,it}from'vitest';import{generate,pathBetween,matchWord}from'./engine';
it('selects only horizontal, vertical and diagonal lines',()=>{expect(pathBetween(0,22)).toEqual([0,11,22]);expect(pathBetween(0,21)).toEqual([]);});
it('embeds each listed word intact in the grid',()=>{for(let i=0;i<10;i++){const b=generate();expect(b.placed).toHaveLength(6);for(const p of b.placed)expect(matchWord(b.grid,p.path,p.word)).toBe(true);}});
