'use client';
import {Component,type ReactNode} from 'react';
import Link from 'next/link';
type Props={children:ReactNode};
type State={failed:boolean};
export class ChatErrorBoundary extends Component<Props,State>{
 state:State={failed:false};
 static getDerivedStateFromError():State{return {failed:true}}
 componentDidCatch(error:Error){console.error('Chat view exception',error.message)}
 render(){
  if(!this.state.failed)return this.props.children;
  return <section role="alert" className="cc-chat-recover" style={{maxWidth:600,margin:'auto',padding:32}}>
   <h2>Unable to display this conversation</h2>
   <p>The chat view encountered an error. Your conversation is not deleted.</p>
   <button type="button" onClick={()=>this.setState({failed:false})}>Try loading again</button>
   <Link href="/messages" style={{marginLeft:16}}>Return to messages</Link>
  </section>;
 }
}
