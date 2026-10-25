import { useEffect, useState } from "react";

export type Route = { name: "home" } | { name: "create" } | { name: "acknowledge"; code: string } | { name: "record"; id: string } | { name: "not-found" };

export const routes = {
  home: () => "/",
  create: () => "/create",
  acknowledge: (code: string) => `/acknowledge/${encodeURIComponent(code)}`,
  record: (id: string) => `/record/${encodeURIComponent(id)}`,
};

const NAVIGATION_EVENT = "truthcap:navigate";

export function parsePath(pathname: string): Route {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const parts = path.split("?")[0].split("/").filter(Boolean);

  if (parts.length === 0) return { name: "home" };

  const [section, param, ...rest] = parts;
  if (section === "create" && !param && rest.length === 0) return { name: "create" };
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

  return parsePath(window.location.pathname);
}

export function navigate(path: string): void {
  const target = path.startsWith("/") ? path : `/${path}`;
  if (window.location.pathname === target) return;

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
    window.addEventListener(NAVIGATION_EVENT, handleChange);

    return () => {
      window.removeEventListener("popstate", handleChange);
      window.removeEventListener(NAVIGATION_EVENT, handleChange);
    };
  }, []);

  return route;
}
