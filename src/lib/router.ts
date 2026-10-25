import { useEffect, useState } from "react";

export type Route = { name: "home" } | { name: "create" } | { name: "records" } | { name: "acknowledge"; code: string } | { name: "record"; id: string } | { name: "shared"; data: string } | { name: "not-found" };

export const routes = {
  home: () => "/",
  create: () => "/create",
  records: () => "/records",
  acknowledge: (code: string) => `/acknowledge/${encodeURIComponent(code)}`,
  record: (id: string) => `/record/${encodeURIComponent(id)}`,
  /** The record payload rides in the fragment so hosts never see it. */
  shared: (data: string) => `/shared#${data}`,
};

const NAVIGATION_EVENT = "truthcap:navigate";

export function parsePath(pathname: string, hash = ""): Route {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const parts = path.split("?")[0].split("/").filter(Boolean);

  if (parts.length === 0) return { name: "home" };

  const [section, param, ...rest] = parts;
  if (section === "create" && !param && rest.length === 0) return { name: "create" };
  if (section === "records" && !param && rest.length === 0) return { name: "records" };
  if (section === "shared" && !param && rest.length === 0) {
    return { name: "shared", data: hash.replace(/^#/, "") };
  }
  if (section === "acknowledge" && param && rest.length === 0) {
    return { name: "acknowledge", code: decodeURIComponent(param).toUpperCase() };
  }
  if (section === "record" && param && rest.length === 0) {
    return { name: "record", id: decodeURIComponent(param) };
  }

  return { name: "not-found" };
}

export function currentRoute(): Route {
  if (typeof window === "undefined") return { name: "home" };

  // Upgrade old hash URLs (/#/create) to clean paths (/create).
  const { hash } = window.location;
  if (hash.startsWith("#/")) {
    window.history.replaceState(null, "", hash.slice(1) || "/");
  }

  return parsePath(window.location.pathname, window.location.hash);
}

function splitTarget(target: string): { path: string; hash: string } {
  const [path, hash = ""] = target.split("#");
  return { path, hash };
}

export function navigate(path: string): void {
  const target = path.startsWith("/") ? path : `/${path}`;
  const { path: targetPath, hash } = splitTarget(target);
  if (window.location.pathname === targetPath && window.location.hash === hash) return;

  window.history.pushState(null, "", target);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function replace(path: string): void {
  const target = path.startsWith("/") ? path : `/${path}`;
  window.history.replaceState(null, "", target);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const handleChange = () => setRoute(currentRoute());

    window.addEventListener("popstate", handleChange);
    window.addEventListener("hashchange", handleChange);
    window.addEventListener(NAVIGATION_EVENT, handleChange);

    return () => {
      window.removeEventListener("popstate", handleChange);
      window.removeEventListener("hashchange", handleChange);
      window.removeEventListener(NAVIGATION_EVENT, handleChange);
    };
  }, []);

  return route;
}
