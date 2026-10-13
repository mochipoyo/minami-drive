// ===== 02e_map_park.js : 駐車の練習場（みなみ自動車学校のコース・スーパーの駐車場・まちの通り） =====
// 教習所のコースの寸法（車庫・縦列の枠の大きさ）はゲーム独自の値です（実際の教習所や試験場とは異なります）。
const PARK={
  // 教習所の外周（1+1）
  K:{x0:-320,x1:-100,z0:-230,z1:-90},
  HK:{x:-210,zEnd:-180,w:2.1,bay:{z:-205,w:3.6,d:6.6}},// 方向変換：外周の北の道から南へ入る行き止まりの狭い道。車庫は進む向きの左（東）
  SLOT:{x0:-232,x1:-224.6,depth:2.5},// 縦列駐車：外周の南の道（東向き）の左側
  R1Z:-40,// まちの通り（東西）
  R2X:-40,// 南へ分かれる道
  LINX:135,// スーパーの駐車場への出入口
  LOT:{x0:60,x1:210,z0:-150,z1:-62,row:[[-147,-142],[-135,-130],[-130,-125],[-118,-113],[-113,-108],[-101,-96]],sx0:80,sx1:190},
  CROSS:40,BUSX:230,HYDRANT:290,NOPARK:[300,360],
};
function parkDef(){const K=PARK.K;const nodes=[],roads=[];
  const N=(id,x,z,o={})=>{nodes.push(Object.assign({id,x,z,kind:'x'},o));};
  N('KNW',K.x0,K.z0);N('KNE',K.x1,K.z0);N('KSE',K.x1,K.z1);N('KSW',K.x0,K.z1);N('HKJ',PARK.HK.x,K.z0);
  const crs=(id,name,from,to,path,o={})=>roads.push(Object.assign({id,name,group:id,type:'CRS',from,to,path,nF:1,nB:1,w:3.5,sh:[0.5,0],center:'white',walk:[0,0],limit:30,feats:[],course:true},o));
  crs('KN1','外周（北）','KNW','HKJ',[[K.x0,K.z0],[PARK.HK.x,K.z0]]);crs('KN2','外周（北）','HKJ','KNE',[[PARK.HK.x,K.z0],[K.x1,K.z0]]);
  crs('KE','外周（東）','KNE','KSE',[[K.x1,K.z0],[K.x1,K.z1]]);crs('KS','外周（南）','KSW','KSE',[[K.x0,K.z1],[K.x1,K.z1]]);crs('KW','外周（西）','KNW','KSW',[[K.x0,K.z0],[K.x0,K.z1]]);
  // 方向変換のコース（狭い行き止まりの道）
  crs('HK','方向変換コース','HKJ',null,[[PARK.HK.x,K.z0],[PARK.HK.x,PARK.HK.zEnd]],{w:PARK.HK.w,sh:[0.25,0],center:'none',limit:0,noKeep:true});
  // まちの通り
  const Z=PARK.R1Z;N('R2J',PARK.R2X,Z,{stop:['S']});N('LINJ',PARK.LINX,Z,{filR:0.6});N('R1W',-380,Z,{kind:'portal'});N('R1E',380,Z,{kind:'portal'});N('R2S',PARK.R2X,220,{kind:'portal'});
  const st=(id,name,from,to,path,o={})=>roads.push(Object.assign({id,name,group:o.group||id,type:'COL',from,to,path,nF:1,nB:1,w:3.0,sh:[0.6,0],center:'white',walk:[3,3],limit:40,feats:[],street:true},o));
  st('R1a','さくら通り商店会','R1W','R2J',[[-380,Z],[PARK.R2X,Z]],{group:'R1'});st('R1b','さくら通り商店会','R2J','LINJ',[[PARK.R2X,Z],[PARK.LINX,Z]],{group:'R1',feats:[{type:'xwalk',abs:PARK.CROSS,w:4}]});
  st('R1c','さくら通り商店会','LINJ','R1E',[[PARK.LINX,Z],[380,Z]],{group:'R1'});st('R2','南の道','R2J','R2S',[[PARK.R2X,Z],[PARK.R2X,220]],{w:2.8});
  roads.push({id:'LIN',name:'さくらマート 駐車場出入口',group:'LIN',type:'LOT',from:'LINJ',path:[[PARK.LINX,Z],[PARK.LINX,PARK.LOT.z1+4]],nF:1,nB:1,w:3.0,sh:[0.4,0],center:'none',walk:[0,0],feats:[],street:true,lotRoad:true});
  const L=PARK.LOT;const HB=PARK.HK.bay;const bx0=PARK.HK.x+PARK.HK.w+0.25,bx1=bx0+HB.d;const S=PARK.SLOT;const sz1=K.z1-4.0,sz0=sz1-S.depth;
  return{nodes,roads,links:[],lots:[
    {id:'BAY',poly:[[bx0-0.6,HB.z-HB.w/2],[bx1,HB.z-HB.w/2],[bx1,HB.z+HB.w/2],[bx0-0.6,HB.z+HB.w/2]],name:'車庫'},
    {id:'SLOT',poly:[[S.x0,sz0],[S.x1,sz0],[S.x1,sz1+0.6],[S.x0,sz1+0.6]],name:'縦列駐車の枠'},
    {id:'MART',poly:[[L.x0,L.z0],[L.x1,L.z0],[L.x1,L.z1],[PARK.LINX+3.4,L.z1],[PARK.LINX+3.4,L.z1+4.5],[PARK.LINX-3.4,L.z1+4.5],[PARK.LINX-3.4,L.z1],[L.x0,L.z1]],name:'さくらマート 駐車場'}]};}
// 方向変換の車庫・縦列駐車の枠（判定に使う長方形）
function parkBayRect(){const HB=PARK.HK.bay;const x0=PARK.HK.x+PARK.HK.w+0.25;return{x0,x1:x0+HB.d,z0:HB.z-HB.w/2,z1:HB.z+HB.w/2};}
function parkSlotRect(){const S=PARK.SLOT;const z1=PARK.K.z1-4.0;return{x0:S.x0,x1:S.x1,z0:z1-S.depth,z1};}
