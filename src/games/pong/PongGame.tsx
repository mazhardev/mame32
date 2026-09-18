import{CanvasRunner}from'../_shared/arcade/CanvasRunner';import{PongEngine}from'./engine';import type{DifficultySetting}from'@/types';
const create=(d:DifficultySetting)=>new PongEngine(d);const controls=[{key:'ArrowUp',label:'Up'},{key:'ArrowDown',label:'Down'}];
export default function PongGame(){return <CanvasRunner create={create} controls={controls} instructions="Move with Up/Down, the buttons, or your pointer. Beat the local computer to seven points."/>;}
