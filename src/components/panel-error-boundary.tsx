'use client';
import {Component,type ReactNode} from 'react';
export class PanelErrorBoundary extends Component<{children:ReactNode;label:string},{failed:boolean}>{
 override state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 override render(){if(this.state.failed)return <section role="alert" className="cc-empty"><h2>{this.props.label} could not load</h2><p>Please retry.</p><button type="button" onClick={()=>this.setState({failed:false})}>Retry</button></section>;return this.props.children}
}
