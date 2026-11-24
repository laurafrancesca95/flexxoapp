// Eenvoudige hash-router (#/collega). Werkt op elke statische host zonder serverinstellingen.
import { useEffect, useState } from "react";

export function currentPath() {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}

export const href = (path: string) => `#${path}`;
export const navigate = (path: string) => {
  window.location.hash = path;
};
