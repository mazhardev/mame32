import{buildDeck,shuffleDeck,cardColor,SUITS}from'../_shared/cards/deck';import type{Card}from'../_shared/cards/deck';
export interface SolitaireState{stock:Card[];waste:Card[];tableau:Card[][];foundations:Card[][];moves:number;}
export type Source={kind:'tableau'|'foundation'|'waste';pile:number;index:number};
export function deal():SolitaireState{const deck=shuffleDeck(buildDeck());const tableau=Array.from({length:7},(_,i)=>Array.from({length:i+1},(_,j)=>({...deck.pop()!,faceUp:j===i})));return{stock:deck,waste:[],tableau,foundations:[[],[],[],[]],moves:0};}
function clone(s:SolitaireState):SolitaireState{return{stock:s.stock.map(c=>({...c})),waste:s.waste.map(c=>({...c})),tableau:s.tableau.map(p=>p.map(c=>({...c}))),foundations:s.foundations.map(p=>p.map(c=>({...c}))),moves:s.moves};}
export function draw(s:SolitaireState):SolitaireState{const n=clone(s);if(n.stock.length)n.waste.push({...n.stock.pop()!,faceUp:true});else{n.stock=n.waste.reverse().map(c=>({...c,faceUp:false}));n.waste=[];}n.moves++;return n;}
export function move(s:SolitaireState,from:Source,to:{kind:'tableau'|'foundation';pile:number}):SolitaireState|null{
 if(from.kind===to.kind&&from.pile===to.pile)return null;
 const source=from.kind==='waste'?s.waste:from.kind==='tableau'?s.tableau[from.pile]:s.foundations[from.pile];
 const destination=to.kind==='tableau'?s.tableau[to.pile]:s.foundations[to.pile];
 if(!source||!destination||from.index<0||from.index>=source.length)return null;
 if(from.kind!=='tableau'&&from.index!==source.length-1)return null;
 const cards=source.slice(from.index);if(cards.some(c=>!c.faceUp))return null;
 for(let i=1;i<cards.length;i++)if(cards[i-1].rank!==cards[i].rank+1||cardColor(cards[i-1].suit)===cardColor(cards[i].suit))return null;
 const first=cards[0],last=destination[destination.length-1];
 if(to.kind==='foundation'){if(cards.length!==1||first.suit!==SUITS[to.pile]||first.rank!==destination.length+1)return null;}
 else if(last?(!last.faceUp||last.rank!==first.rank+1||cardColor(last.suit)===cardColor(first.suit)):first.rank!==13)return null;
 const n=clone(s);const src=from.kind==='waste'?n.waste:from.kind==='tableau'?n.tableau[from.pile]:n.foundations[from.pile];
 const dest=to.kind==='tableau'?n.tableau[to.pile]:n.foundations[to.pile];dest.push(...src.splice(from.index));if(from.kind==='tableau'&&src.length)src[src.length-1].faceUp=true;n.moves++;return n;
}
export function complete(s:SolitaireState){return s.foundations.every(p=>p.length===13);}
export function hint(s:SolitaireState):{from:Source;to:{kind:'tableau'|'foundation';pile:number}}|null{
 const sources:Source[]=[];if(s.waste.length)sources.push({kind:'waste',pile:0,index:s.waste.length-1});s.tableau.forEach((p,pile)=>p.forEach((c,index)=>{if(c.faceUp)sources.push({kind:'tableau',pile,index});}));
 for(const kind of ['foundation','tableau'] as const)for(const from of sources)for(let pile=0;pile<(kind==='tableau'?7:4);pile++){if(kind==='tableau'&&!s.tableau[pile].length&&from.kind==='tableau'&&from.index===0)continue;const to={kind,pile};if(move(s,from,to))return{from,to};}return null;
}
export function validSave(value:unknown):value is SolitaireState{
 if(!value||typeof value!=='object')return false;const s=value as SolitaireState;
 if(!Array.isArray(s.stock)||!Array.isArray(s.waste)||!Array.isArray(s.tableau)||s.tableau.length!==7||!Array.isArray(s.foundations)||s.foundations.length!==4||!Number.isInteger(s.moves)||s.moves<0)return false;
 if([...s.tableau,...s.foundations].some(p=>!Array.isArray(p)))return false;
 const all=[...s.stock,...s.waste,...s.tableau.flat(),...s.foundations.flat()];
 if(all.length!==52||all.some(c=>!c||!SUITS.includes(c.suit)||!Number.isInteger(c.rank)||c.rank<1||c.rank>13||typeof c.faceUp!=='boolean'||c.id!==`0-${c.suit}-${c.rank}`)||new Set(all.map(c=>c.id)).size!==52)return false;
 if(s.stock.some(c=>c.faceUp)||s.waste.some(c=>!c.faceUp))return false;
 if(s.foundations.some((p,i)=>p.some((c,j)=>c.suit!==SUITS[i]||c.rank!==j+1||!c.faceUp)))return false;
 return s.tableau.every(p=>{const i=p.findIndex(c=>c.faceUp);if(p.length&&i<0)return false;const up=p.slice(i);return up.every((c,j)=>c.faceUp&&(j===0||(up[j-1].rank===c.rank+1&&cardColor(up[j-1].suit)!==cardColor(c.suit))));});
}
