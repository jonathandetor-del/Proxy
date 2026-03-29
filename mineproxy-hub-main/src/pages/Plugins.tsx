import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, Upload, Trash2, Search, Power } from 'lucide-react';
import { api, PluginInfo } from '@/lib/api';
import { toast } from 'sonner';

const Plugins = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const uploadRef = useRef<HTMLInputElement>(null);

  const fetchPlugins = async () => {
    try {
      const data = await api<{ plugins: PluginInfo[] }>('GET', '/api/plugins');
      setPlugins(data.plugins || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchPlugins(); }, []);

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const buf = await file.arrayBuffer();
        await fetch(`/api/plugins/upload?name=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          credentials: 'same-origin',
          body: buf,
        });
        toast.success(`Uploaded ${file.name}`);
      } catch (e: any) {
        toast.error(`Upload failed: ${e.message}`);
      }
    }
    fetchPlugins();
  };

  const handleToggle = async (name: string, currentlyEnabled: boolean) => {
    try {
      const res = await api<{ ok: boolean; enabled: boolean; error?: string }>('POST', `/api/plugins/${encodeURIComponent(name)}/toggle`);
      if (res.ok) {
        toast.success(`${name} ${res.enabled ? 'enabled' : 'disabled'} (restart to apply)`);
        setPlugins(prev => prev.map(p => p.name === name ? { ...p, enabled: res.enabled, filename: res.enabled ? p.filename.replace(/\.disabled\.jar$/i, '.jar') : p.filename.replace(/\.jar$/i, '.disabled.jar') } : p));
      } else {
        toast.error(res.error || 'Toggle failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete plugin "${name}"?`)) return;
    try {
      const res = await api<{ ok: boolean; error?: string }>('POST', `/api/plugins/${encodeURIComponent(name)}/delete`);
      if (res.ok) {
        toast.success(`Deleted ${name}`);
        setPlugins(prev => prev.filter(p => p.name !== name));
      } else {
        toast.error(res.error || 'Delete failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = plugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Plugins</h2>
          <span className="text-xs text-muted-foreground">{plugins.length} installed</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={uploadRef} accept=".jar" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          <button onClick={() => uploadRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Upload className="h-3 w-3" /> Upload
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plugins..."
          className="w-full bg-secondary rounded-md pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? 'No matching plugins' : 'No plugins installed'}
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.name} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                      {p.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(p.name, p.enabled)}
                  className={`p-1.5 rounded transition-colors ${p.enabled ? 'hover:bg-yellow-500/10' : 'hover:bg-green-500/10'}`}
                  title={p.enabled ? 'Disable plugin' : 'Enable plugin'}
                >
                  <Power className={`h-3.5 w-3.5 ${p.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                </button>
                <button
                  onClick={() => handleDelete(p.name)}
                  className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                  title="Delete plugin"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Plugins;
