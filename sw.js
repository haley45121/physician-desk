/* Service worker for The Physician Desk.
   VERSION is rewritten by build.js with a hash of the built index.html, so every
   deploy lands in a fresh cache and the old one is deleted on activate.

   Navigation is network first: when she has signal she gets the current build,
   and when she does not she gets the last one that loaded. Everything else is
   cache first, because the icons and manifest never change within a version. */
const VERSION = "09ad00e68c00";
const CACHE = "pdesk-" + VERSION;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(ev){
  ev.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      /* One missing optional file must not leave her with no offline copy at all. */
      .catch(function(){ return caches.open(CACHE).then(function(c){ return c.add("./index.html"); }); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(ev){
  ev.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(ev){
  const req = ev.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    ev.respondWith(
      fetch(req)
        .then(function(res){
          const copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
          return res;
        })
        .catch(function(){
          return caches.match("./index.html").then(function(hit){
            return hit || caches.match("./");
          });
        })
    );
    return;
  }

  ev.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        const copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      });
    })
  );
});
