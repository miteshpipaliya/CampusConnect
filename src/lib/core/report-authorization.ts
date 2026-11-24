export function mayReport(input:{exists:boolean;visible:boolean;blocked:boolean;self:boolean}):boolean{return input.exists&&input.visible&&!input.blocked&&!input.self}
