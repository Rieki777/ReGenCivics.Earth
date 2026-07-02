import { useState } from "react";
import { Link, useLocation } from "wouter";
import CoreImage from "./CoreImage";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/faith", label: "Our Faith" },
  { href: "/programs", label: "Programs" },
  { href: "/elders", label: "Elders" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/donate", label: "Donate" },
  { href: "/transparency", label: "Transparency" },
];

export default function CoreNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="core-nav">
      <div className="wrap">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="seed" aria-hidden="true"><CoreImage id="core-emblem" sizes="30px" fallback={<>🌱</>} /></span> CORE
        </Link>
        <nav className={`nav-links${open ? " open" : ""}`} aria-label="Church navigation">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={location === item.href ? "active" : undefined}
              aria-current={location === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
