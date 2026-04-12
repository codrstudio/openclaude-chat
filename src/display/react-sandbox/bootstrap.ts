// The bootstrap script runs INSIDE the sandboxed iframe.
// It is serialized to a string and embedded in the srcdoc HTML.
// Keep it dependency-free — only browser APIs + the 5 globals injected via <script> tags.

export const SANDBOX_BOOTSTRAP = `
(function() {
  var WHITELIST = {
    "react": "__React",
    "react-dom": "__ReactDOM",
    "react-dom/client": "__ReactDOM",
    "framer-motion": "__FramerMotion",
    "recharts": "__Recharts",
    "lucide-react": "__LucideReact"
  };

  function getGlobal(name) {
    return window[WHITELIST[name]];
  }

  function makeRequire() {
    return function require(name) {
      var g = getGlobal(name);
      if (!g) throw new Error("sandbox: module not in whitelist: " + name);
      return g;
    };
  }

  function renderError(title, detail) {
    var root = document.getElementById("root");
    if (!root) return;
    root.innerHTML = "";
    var box = document.createElement("div");
    box.style.cssText = "padding:12px 14px;border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;border-radius:8px;font:12px/1.5 system-ui,sans-serif;";
    var t = document.createElement("div");
    t.style.cssText = "font-weight:600;margin-bottom:4px;";
    t.textContent = title;
    box.appendChild(t);
    if (detail) {
      var d = document.createElement("pre");
      d.style.cssText = "margin:4px 0 0;white-space:pre-wrap;word-break:break-word;font:11px/1.4 ui-monospace,monospace;color:#7f1d1d;";
      d.textContent = String(detail);
      box.appendChild(d);
    }
    root.appendChild(box);
  }

  function applyTheme(theme) {
    var dark = theme === "dark" || (theme === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    if (dark) {
      root.style.setProperty("--bg", "#0a0a0a");
      root.style.setProperty("--fg", "#fafafa");
      root.style.setProperty("--muted", "#a3a3a3");
      root.style.setProperty("--border", "#262626");
      root.style.setProperty("--accent", "#60a5fa");
      document.body.style.background = "#0a0a0a";
      document.body.style.color = "#fafafa";
    } else {
      root.style.setProperty("--bg", "#ffffff");
      root.style.setProperty("--fg", "#0a0a0a");
      root.style.setProperty("--muted", "#737373");
      root.style.setProperty("--border", "#e5e5e5");
      root.style.setProperty("--accent", "#2563eb");
      document.body.style.background = "#ffffff";
      document.body.style.color = "#0a0a0a";
    }
  }

  function mount(payload, compiledCode) {
    try {
      var React = window.__React;
      var ReactDOM = window.__ReactDOM;
      var FramerMotion = window.__FramerMotion;
      if (!React || !ReactDOM) {
        renderError("Sandbox: React runtime missing", "__React/__ReactDOM not on window.");
        return;
      }

      applyTheme(payload.theme || "auto");

      // Evaluate compiled CJS module. sucrase's "imports" transform produces code
      // that expects exports/module/require in scope.
      var moduleObj = { exports: {} };
      var exportsObj = moduleObj.exports;
      var requireFn = makeRequire();
      var fn;
      try {
        // eslint-disable-next-line no-new-func
        fn = new Function("exports", "module", "require", "React", compiledCode);
      } catch (e) {
        renderError("Sandbox: compile error", e && e.message);
        return;
      }
      try {
        fn(exportsObj, moduleObj, requireFn, React);
      } catch (e) {
        renderError("Sandbox: runtime error", e && (e.stack || e.message));
        return;
      }
      var Component = moduleObj.exports && (moduleObj.exports.default || moduleObj.exports);
      if (typeof Component !== "function") {
        renderError("Sandbox: no default export", "Expected 'export default function ...' but got: " + typeof Component);
        return;
      }

      // Minimal error boundary
      var ErrorBoundary = (function() {
        function EB(props) { React.Component.call(this, props); this.state = { err: null }; }
        EB.prototype = Object.create(React.Component.prototype);
        EB.prototype.constructor = EB;
        EB.getDerivedStateFromError = function(err) { return { err: err }; };
        EB.prototype.componentDidCatch = function(err) { renderError("Sandbox: render crash", err && (err.stack || err.message)); };
        EB.prototype.render = function() {
          if (this.state.err) return null;
          return this.props.children;
        };
        return EB;
      })();

      var root = document.getElementById("root");
      root.innerHTML = "";
      var element = React.createElement(ErrorBoundary, null, React.createElement(Component, payload.initialProps || {}));
      if (FramerMotion && FramerMotion.MotionConfig) {
        element = React.createElement(FramerMotion.MotionConfig, { reducedMotion: "user" }, element);
      }
      var reactRoot = ReactDOM.createRoot(root);
      reactRoot.render(element);

      // ResizeObserver → notify parent of content height
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function(entries) {
          for (var i = 0; i < entries.length; i++) {
            var h = Math.ceil(entries[i].contentRect.height);
            window.parent.postMessage({ type: "sandbox-height", height: h }, "*");
          }
        });
        ro.observe(root);
      }

      window.parent.postMessage({ type: "sandbox-ready" }, "*");
    } catch (e) {
      renderError("Sandbox: unexpected error", e && (e.stack || e.message));
    }
  }

  window.addEventListener("message", function(ev) {
    var data = ev.data;
    if (!data || data.type !== "sandbox-render") return;
    mount(data.payload, data.compiledCode);
  });

  // Signal parent we are alive and waiting for code
  window.parent.postMessage({ type: "sandbox-boot" }, "*");
})();
`
