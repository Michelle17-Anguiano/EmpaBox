import { useState, useReducer, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// ─── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAW7mRuuri47P5p6NWa_z1EP6FbJNuAi30",
  authDomain: "empabox-d292a.firebaseapp.com",
  projectId: "empabox-d292a",
  storageBucket: "empabox-d292a.firebasestorage.app",
  messagingSenderId: "641696241625",
  appId: "1:641696241625:web:6d8fd61c82123eaebeebc8"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Initial Data ─────────────────────────────────────────────────────────────
const initialInventory = [
  { id: 1, nombre: "Caja corrugada 30x20x15", categoria: "Cajas", stock: 150, minimo: 30, costo: 8.5, precio: 15, unidad: "pza" },
  { id: 2, nombre: "Bolsa kraft 25x35", categoria: "Bolsas", stock: 80, minimo: 50, costo: 3.2, precio: 6, unidad: "pza" },
  { id: 3, nombre: "Film stretch transparente", categoria: "Protección", stock: 12, minimo: 10, costo: 120, precio: 180, unidad: "rollo" },
  { id: 4, nombre: "Cinta de empaque 48mm", categoria: "Fijación", stock: 6, minimo: 15, costo: 22, precio: 38, unidad: "rollo" },
  { id: 5, nombre: "Papel burbuja 1.2m", categoria: "Protección", stock: 5, minimo: 8, costo: 95, precio: 145, unidad: "rollo" },
];
const initialTareas = [
  { id: 1, texto: "Surtir cinta de empaque", prioridad: "alta", hecha: false, asignado: "Ambos", fecha: "2026-06-10" },
  { id: 2, texto: "Cotizar proveedor de papel burbuja", prioridad: "media", hecha: false, asignado: "Tú", fecha: "2026-06-12" },
  { id: 3, texto: "Etiquetar estantes del almacén", prioridad: "baja", hecha: false, asignado: "Novio", fecha: "2026-06-15" },
];
const initialPedidos = [
  { id: 1, cliente: "Ferretería López", producto: "Caja corrugada 30x20x15", cantidad: 50, total: 750, estado: "entregado", fecha: "2026-06-05" },
  { id: 2, cliente: "Tienda Moda Sur", producto: "Bolsa kraft 25x35", cantidad: 100, total: 600, estado: "pendiente", fecha: "2026-06-09" },
  { id: 3, cliente: "Distribuidora Norte", producto: "Film stretch transparente", cantidad: 5, total: 900, estado: "en proceso", fecha: "2026-06-08" },
];

// ─── Reducers ─────────────────────────────────────────────────────────────────
function inventarioReducer(state, action) {
  switch (action.type) {
    case "SET": return action.data;
    case "ADD": return [...state, { ...action.item, id: Date.now() }];
    case "UPDATE": return state.map(i => i.id === action.item.id ? action.item : i);
    case "DELETE": return state.filter(i => i.id !== action.id);
    case "ADJUST_STOCK": return state.map(i => i.id === action.id ? { ...i, stock: Math.max(0, i.stock + action.delta) } : i);
    default: return state;
  }
}
function tareasReducer(state, action) {
  switch (action.type) {
    case "SET": return action.data;
    case "ADD": return [...state, { ...action.tarea, id: Date.now(), hecha: false }];
    case "TOGGLE": return state.map(t => t.id === action.id ? { ...t, hecha: !t.hecha } : t);
    case "DELETE": return state.filter(t => t.id !== action.id);
    default: return state;
  }
}
function pedidosReducer(state, action) {
  switch (action.type) {
    case "SET": return action.data;
    case "ADD": return [...state, { ...action.pedido, id: Date.now() }];
    case "UPDATE_ESTADO": return state.map(p => p.id === action.id ? { ...p, estado: action.estado } : p);
    case "DELETE": return state.filter(p => p.id !== action.id);
    default: return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const prioColor = { alta: "#e74c3c", media: "#f39c12", baja: "#27ae60" };
const estadoColor = { entregado: "#27ae60", "en proceso": "#2980b9", pendiente: "#e67e22" };
const catColor = { Cajas: "#8B5E3C", Bolsas: "#2C7A4B", Protección: "#1A5F7A", "Fijación": "#6B3FA0" };

// ─── UI Primitives ────────────────────────────────────────────────────────────
function Badge({ color, children }) {
  return <span style={{ background: color+"22", color, border:`1px solid ${color}55`, borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{children}</span>;
}
function Card({ children, style={} }) {
  return <div style={{ background:"#fff", borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 12px #1a1a2e12", border:"1px solid #e8e8f0", ...style }}>{children}</div>;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#0006", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:18, padding:28, width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px #0003" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, color:"#1a1a2e", fontSize:18 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#888" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", marginBottom:4, fontSize:13, color:"#555", fontWeight:600 }}>{label}</label>}
      <input style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #dde", fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"inherit" }} {...props} />
    </div>
  );
}
function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", marginBottom:4, fontSize:13, color:"#555", fontWeight:600 }}>{label}</label>}
      <select style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #dde", fontSize:14, boxSizing:"border-box", background:"#fff", fontFamily:"inherit" }} {...props}>{children}</select>
    </div>
  );
}
function Btn({ children, onClick, color="#3B5BDB", small, full, style={} }) {
  return (
    <button onClick={onClick} style={{ background:color, color:"#fff", border:"none", borderRadius:8, padding:small?"6px 12px":"10px 20px", fontSize:small?13:14, cursor:"pointer", fontWeight:600, width:full?"100%":"auto", fontFamily:"inherit", ...style }}
      onMouseOver={e=>e.currentTarget.style.opacity=".85"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ inventario, tareas, pedidos }) {
  const bajoStock = inventario.filter(i => i.stock <= i.minimo);
  const tareasHoy = tareas.filter(t => !t.hecha).length;
  const ventasMes = pedidos.filter(p => p.estado === "entregado").reduce((s,p)=>s+p.total,0);
  const stats = [
    { label:"Productos en inventario", valor:inventario.length, color:"#3B5BDB" },
    { label:"Bajo stock ⚠️", valor:bajoStock.length, color:"#e74c3c" },
    { label:"Tareas pendientes", valor:tareasHoy, color:"#f39c12" },
    { label:"Ventas entregadas ($)", valor:`$${ventasMes.toLocaleString()}`, color:"#27ae60" },
  ];
  return (
    <div>
      <h2 style={{ color:"#1a1a2e", marginBottom:6 }}>Panel General</h2>
      <p style={{ color:"#888", marginTop:0, marginBottom:24, fontSize:14 }}>Vista rápida de tu negocio</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:28 }}>
        {stats.map((s,i)=>(
          <Card key={i} style={{ borderLeft:`4px solid ${s.color}` }}>
            <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.valor}</div>
            <div style={{ fontSize:13, color:"#666", marginTop:4 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      {bajoStock.length>0 && (
        <Card style={{ borderLeft:"4px solid #e74c3c", marginBottom:20 }}>
          <h3 style={{ margin:"0 0 12px", color:"#e74c3c", fontSize:15 }}>⚠️ Productos con bajo stock</h3>
          {bajoStock.map(p=>(
            <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #f5e6e6" }}>
              <span style={{ fontSize:14 }}>{p.nombre}</span>
              <span style={{ color:"#e74c3c", fontWeight:700, fontSize:14 }}>{p.stock} / {p.minimo} min</span>
            </div>
          ))}
        </Card>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card>
          <h3 style={{ margin:"0 0 12px", fontSize:15, color:"#1a1a2e" }}>📋 Últimas tareas</h3>
          {tareas.slice(0,4).map(t=>(
            <div key={t.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"5px 0", borderBottom:"1px solid #f0f0f5" }}>
              <span style={{ fontSize:13 }}>{t.hecha?"✅":"⬜"}</span>
              <span style={{ fontSize:13, textDecoration:t.hecha?"line-through":"none", color:t.hecha?"#aaa":"#333", flex:1 }}>{t.texto}</span>
              <Badge color={prioColor[t.prioridad]}>{t.prioridad}</Badge>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ margin:"0 0 12px", fontSize:15, color:"#1a1a2e" }}>🛒 Pedidos recientes</h3>
          {pedidos.slice(0,4).map(p=>(
            <div key={p.id} style={{ padding:"5px 0", borderBottom:"1px solid #f0f0f5" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{p.cliente}</span>
                <Badge color={estadoColor[p.estado]}>{p.estado}</Badge>
              </div>
              <span style={{ fontSize:12, color:"#888" }}>${p.total.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── Inventario ───────────────────────────────────────────────────────────────
function Inventario({ inventario, dispatch }) {
  const [buscar, setBuscar] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const filtrado = inventario.filter(i=>i.nombre.toLowerCase().includes(buscar.toLowerCase())||i.categoria.toLowerCase().includes(buscar.toLowerCase()));
  const openAdd = () => { setForm({ nombre:"", categoria:"Cajas", stock:0, minimo:10, costo:0, precio:0, unidad:"pza" }); setModal("add"); };
  const openEdit = item => { setForm({...item}); setModal("edit"); };
  const handleSave = () => {
    if(!form.nombre) return;
    const item = {...form, stock:+form.stock, minimo:+form.minimo, costo:+form.costo, precio:+form.precio};
    dispatch({ type: modal==="add"?"ADD":"UPDATE", item });
    setModal(null);
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, color:"#1a1a2e" }}>Inventario</h2>
          <p style={{ margin:0, color:"#888", fontSize:13 }}>{inventario.length} productos registrados</p>
        </div>
        <Btn onClick={openAdd}>＋ Agregar producto</Btn>
      </div>
      <div style={{ position:"relative", marginBottom:16 }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>🔍</span>
        <input placeholder="Buscar producto o categoría..." value={buscar} onChange={e=>setBuscar(e.target.value)}
          style={{ width:"100%", padding:"10px 12px 10px 38px", borderRadius:10, border:"1.5px solid #dde", fontSize:14, boxSizing:"border-box", fontFamily:"inherit" }} />
      </div>
      <div style={{ display:"grid", gap:10 }}>
        {filtrado.map(item=>{
          const bajo = item.stock <= item.minimo;
          return (
            <Card key={item.id} style={{ borderLeft:`4px solid ${catColor[item.categoria]||"#888"}`, padding:"14px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{item.nombre}</div>
                  <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                    <Badge color={catColor[item.categoria]||"#888"}>{item.categoria}</Badge>{" "}· Costo: ${item.costo} · Precio: ${item.precio}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontWeight:800, fontSize:22, color:bajo?"#e74c3c":"#27ae60" }}>{item.stock}</div>
                    <div style={{ fontSize:11, color:"#aaa" }}>{item.unidad} · mín {item.minimo}</div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn small color="#27ae60" onClick={()=>dispatch({type:"ADJUST_STOCK",id:item.id,delta:1})}>+</Btn>
                    <Btn small color="#e74c3c" onClick={()=>dispatch({type:"ADJUST_STOCK",id:item.id,delta:-1})}>−</Btn>
                    <Btn small color="#666" onClick={()=>openEdit(item)}>✏️</Btn>
                    <Btn small color="#eee" style={{color:"#e74c3c"}} onClick={()=>dispatch({type:"DELETE",id:item.id})}>🗑️</Btn>
                  </div>
                </div>
              </div>
              {bajo && <div style={{ marginTop:8, fontSize:12, color:"#e74c3c", fontWeight:600 }}>⚠️ Stock bajo — reponer pronto</div>}
            </Card>
          );
        })}
      </div>
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Agregar producto":"Editar producto"} onClose={()=>setModal(null)}>
          <Input label="Nombre del producto" value={form.nombre||""} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej. Caja corrugada 30x20x15"/>
          <Select label="Categoría" value={form.categoria||"Cajas"} onChange={e=>setForm({...form,categoria:e.target.value})}>
            {["Cajas","Bolsas","Protección","Fijación","Etiquetas","Relleno","Otro"].map(c=><option key={c}>{c}</option>)}
          </Select>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Stock actual" type="number" value={form.stock||0} onChange={e=>setForm({...form,stock:e.target.value})}/>
            <Input label="Stock mínimo" type="number" value={form.minimo||0} onChange={e=>setForm({...form,minimo:e.target.value})}/>
            <Input label="Costo ($)" type="number" value={form.costo||0} onChange={e=>setForm({...form,costo:e.target.value})}/>
            <Input label="Precio venta ($)" type="number" value={form.precio||0} onChange={e=>setForm({...form,precio:e.target.value})}/>
          </div>
          <Select label="Unidad" value={form.unidad||"pza"} onChange={e=>setForm({...form,unidad:e.target.value})}>
            {["pza","rollo","kg","caja","paquete","metro"].map(u=><option key={u}>{u}</option>)}
          </Select>
          <Btn full onClick={handleSave} color="#3B5BDB">{modal==="add"?"Guardar producto":"Actualizar"}</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── Tareas ───────────────────────────────────────────────────────────────────
function Tareas({ tareas, dispatch }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ texto:"", prioridad:"media", asignado:"Ambos", fecha:"" });
  const handleAdd = () => {
    if(!form.texto) return;
    dispatch({ type:"ADD", tarea:form });
    setForm({ texto:"", prioridad:"media", asignado:"Ambos", fecha:"" });
    setModal(false);
  };
  const pendientes = tareas.filter(t=>!t.hecha);
  const hechas = tareas.filter(t=>t.hecha);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, color:"#1a1a2e" }}>Tareas</h2>
          <p style={{ margin:0, color:"#888", fontSize:13 }}>{pendientes.length} pendientes · {hechas.length} completadas</p>
        </div>
        <Btn onClick={()=>setModal(true)}>＋ Nueva tarea</Btn>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {[...pendientes,...hechas].map(t=>(
          <Card key={t.id} style={{ padding:"12px 16px", opacity:t.hecha?0.6:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="checkbox" checked={t.hecha} onChange={()=>dispatch({type:"TOGGLE",id:t.id})} style={{ width:18, height:18, cursor:"pointer", accentColor:"#3B5BDB" }}/>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, fontSize:14, textDecoration:t.hecha?"line-through":"none", color:t.hecha?"#aaa":"#1a1a2e" }}>{t.texto}</span>
                <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
                  <Badge color={prioColor[t.prioridad]}>{t.prioridad}</Badge>
                  <span style={{ fontSize:12, color:"#888" }}>👤 {t.asignado}</span>
                  {t.fecha && <span style={{ fontSize:12, color:"#888" }}>📅 {t.fecha}</span>}
                </div>
              </div>
              <Btn small color="#eee" style={{color:"#e74c3c"}} onClick={()=>dispatch({type:"DELETE",id:t.id})}>🗑️</Btn>
            </div>
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title="Nueva tarea" onClose={()=>setModal(false)}>
          <Input label="Descripción de la tarea" value={form.texto} onChange={e=>setForm({...form,texto:e.target.value})} placeholder="Ej. Reabastecer cajas corrugadas"/>
          <Select label="Prioridad" value={form.prioridad} onChange={e=>setForm({...form,prioridad:e.target.value})}>
            <option value="alta">🔴 Alta</option>
            <option value="media">🟡 Media</option>
            <option value="baja">🟢 Baja</option>
          </Select>
          <Select label="Asignado a" value={form.asignado} onChange={e=>setForm({...form,asignado:e.target.value})}>
            <option>Ambos</option><option>Tú</option><option>Novio</option>
          </Select>
          <Input label="Fecha límite (opcional)" type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
          <Btn full onClick={handleAdd} color="#3B5BDB">Agregar tarea</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────
function Pedidos({ pedidos, dispatch, inventario }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ cliente:"", producto:"", cantidad:1, total:0, estado:"pendiente", fecha:new Date().toISOString().slice(0,10) });
  const [filtro, setFiltro] = useState("todos");
  const filtrados = filtro==="todos" ? pedidos : pedidos.filter(p=>p.estado===filtro);
  const handleAdd = () => {
    if(!form.cliente||!form.producto) return;
    dispatch({ type:"ADD", pedido:{...form, cantidad:+form.cantidad, total:+form.total} });
    setModal(false);
    setForm({ cliente:"", producto:"", cantidad:1, total:0, estado:"pendiente", fecha:new Date().toISOString().slice(0,10) });
  };
  const totalVentas = pedidos.filter(p=>p.estado==="entregado").reduce((s,p)=>s+p.total,0);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, color:"#1a1a2e" }}>Pedidos</h2>
          <p style={{ margin:0, color:"#888", fontSize:13 }}>Total entregado: <strong style={{color:"#27ae60"}}>${totalVentas.toLocaleString()}</strong></p>
        </div>
        <Btn onClick={()=>setModal(true)}>＋ Nuevo pedido</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {["todos","pendiente","en proceso","entregado"].map(f=>(
          <button key={f} onClick={()=>setFiltro(f)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${filtro===f?"#3B5BDB":"#dde"}`, background:filtro===f?"#3B5BDB":"#fff", color:filtro===f?"#fff":"#555", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>{f}</button>
        ))}
      </div>
      <div style={{ display:"grid", gap:10 }}>
        {filtrados.map(p=>(
          <Card key={p.id} style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{p.cliente}</div>
                <div style={{ fontSize:13, color:"#666", marginTop:2 }}>{p.producto} · {p.cantidad} unid.</div>
                <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>📅 {p.fecha}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <div style={{ fontWeight:800, fontSize:18, color:"#1a1a2e" }}>${p.total.toLocaleString()}</div>
                <Badge color={estadoColor[p.estado]}>{p.estado}</Badge>
                <div style={{ display:"flex", gap:4 }}>
                  {p.estado!=="entregado" && (
                    <Btn small color="#27ae60" onClick={()=>dispatch({type:"UPDATE_ESTADO",id:p.id,estado:p.estado==="pendiente"?"en proceso":"entregado"})}>
                      {p.estado==="pendiente"?"▶ Procesar":"✔ Entregar"}
                    </Btn>
                  )}
                  <Btn small color="#eee" style={{color:"#e74c3c"}} onClick={()=>dispatch({type:"DELETE",id:p.id})}>🗑️</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title="Nuevo pedido" onClose={()=>setModal(false)}>
          <Input label="Cliente" value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} placeholder="Nombre del cliente"/>
          <Select label="Producto" value={form.producto} onChange={e=>setForm({...form,producto:e.target.value})}>
            <option value="">Seleccionar...</option>
            {inventario.map(i=><option key={i.id} value={i.nombre}>{i.nombre}</option>)}
          </Select>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Input label="Cantidad" type="number" value={form.cantidad} onChange={e=>setForm({...form,cantidad:e.target.value})}/>
            <Input label="Total ($)" type="number" value={form.total} onChange={e=>setForm({...form,total:e.target.value})}/>
          </div>
          <Select label="Estado inicial" value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}>
            <option value="pendiente">Pendiente</option>
            <option value="en proceso">En proceso</option>
            <option value="entregado">Entregado</option>
          </Select>
          <Input label="Fecha" type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
          <Btn full onClick={handleAdd} color="#3B5BDB">Registrar pedido</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [inventario, dispatchInv] = useReducer(inventarioReducer, initialInventory);
  const [tareas, dispatchTareas] = useReducer(tareasReducer, initialTareas);
  const [pedidos, dispatchPedidos] = useReducer(pedidosReducer, initialPedidos);
  const [tab, setTab] = useState("dashboard");
  const [syncStatus, setSyncStatus] = useState("conectando");
  const [cargado, setCargado] = useState(false);

  // ── Escuchar cambios en tiempo real desde Firebase ──
  useEffect(() => {
    const unsub1 = onSnapshot(doc(db, "empabox", "inventario"), snap => {
      if (snap.exists() && snap.data().items) {
        dispatchInv({ type: "SET", data: snap.data().items });
      }
      setCargado(true);
      setSyncStatus("sincronizado");
    }, () => setSyncStatus("error"));

    const unsub2 = onSnapshot(doc(db, "empabox", "tareas"), snap => {
      if (snap.exists() && snap.data().items) dispatchTareas({ type: "SET", data: snap.data().items });
    });

    const unsub3 = onSnapshot(doc(db, "empabox", "pedidos"), snap => {
      if (snap.exists() && snap.data().items) dispatchPedidos({ type: "SET", data: snap.data().items });
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // ── Guardar en Firebase cuando cambian los datos ──
  useEffect(() => {
    if (!cargado) return;
    setSyncStatus("guardando");
    const t = setTimeout(async () => {
      try {
        await setDoc(doc(db, "empabox", "inventario"), { items: inventario });
        await setDoc(doc(db, "empabox", "tareas"), { items: tareas });
        await setDoc(doc(db, "empabox", "pedidos"), { items: pedidos });
        setSyncStatus("sincronizado");
      } catch { setSyncStatus("error"); }
    }, 800);
    return () => clearTimeout(t);
  }, [inventario, tareas, pedidos, cargado]);

  const syncInfo = {
    conectando: { color:"#888", icon:"⏳", texto:"Conectando..." },
    guardando:  { color:"#f39c12", icon:"💾", texto:"Guardando..." },
    sincronizado: { color:"#27ae60", icon:"☁️", texto:"Sincronizado" },
    error:      { color:"#e74c3c", icon:"⚠️", texto:"Sin conexión" },
  }[syncStatus];

  const nav = [
    { id:"dashboard", label:"Inicio", icon:"📊" },
    { id:"inventario", label:"Inventario", icon:"📦" },
    { id:"tareas", label:"Tareas", icon:"✅" },
    { id:"pedidos", label:"Pedidos", icon:"🛒" },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", minHeight:"100vh", background:"#f4f5fb" }}>
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 12px #0003" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:26 }}>📦</span>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>EmpaBox</div>
            <div style={{ fontSize:11, color:"#aab" }}>Sistema de gestión · Empaques & Embalajes</div>
          </div>
        </div>
        <div style={{ fontSize:12, color:syncInfo.color, display:"flex", alignItems:"center", gap:5, background:"#ffffff15", padding:"5px 12px", borderRadius:20 }}>
          {syncInfo.icon} {syncInfo.texto}
        </div>
      </div>

      <div style={{ background:"#fff", borderBottom:"1px solid #eee", padding:"0 16px", display:"flex", overflowX:"auto" }}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{ padding:"12px 18px", border:"none", background:"none", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:tab===n.id?700:500, color:tab===n.id?"#3B5BDB":"#666", borderBottom:tab===n.id?"2.5px solid #3B5BDB":"2.5px solid transparent", whiteSpace:"nowrap" }}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 16px 40px" }}>
        {tab==="dashboard"  && <Dashboard inventario={inventario} tareas={tareas} pedidos={pedidos}/>}
        {tab==="inventario" && <Inventario inventario={inventario} dispatch={dispatchInv}/>}
        {tab==="tareas"     && <Tareas tareas={tareas} dispatch={dispatchTareas}/>}
        {tab==="pedidos"    && <Pedidos pedidos={pedidos} dispatch={dispatchPedidos} inventario={inventario}/>}
      </div>
    </div>
  );
}
