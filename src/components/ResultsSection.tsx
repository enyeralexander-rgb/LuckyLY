"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Result = {
  id: string;
  title: string;
  type: string;
  executedAt: string | null;
  winningItem: string | null;
  prizes: string[];
  winnersCount: number;
};

export function ResultsSection() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/results")
      .then((r) => {
        if (!r.ok) {
          throw new Error("Error al cargar resultados");
        }
        return r.json();
      })
      .then((data) => {
        if (data.error) {
          console.error("Error en la respuesta:", data.error);
          setResults([]);
          setLoading(false);
          return;
        }
        
        if (!Array.isArray(data)) {
          console.error("Error: los datos no son un array", data);
          setResults([]);
          setLoading(false);
          return;
        }
        
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar resultados:", err);
        setResults([]);
        setLoading(false);
      });
  }, []);

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      NUMBERS: "NÚMEROS",
      ANIMALS: "ANIMALES",
      STATES: "ESTADOS",
      FLAGS: "BANDERAS",
      ZODIAC: "ZODIACALES"
    };
    return labels[type] || type.toUpperCase();
  }

  function getTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      NUMBERS: "🔢",
      ANIMALS: "🐾",
      STATES: "🗺️",
      FLAGS: "🏴",
      ZODIAC: "♈"
    };
    return emojis[type] || "🎰";
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatTime(dateString: string | null): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${String(displayHours).padStart(2, "0")}:${minutes} ${period}`;
  }

  if (loading) {
    return (
      <section className="results-section">
        <div className="container">
          <div className="results-header">
            <h2 className="results-title">🏆 RESULTADOS</h2>
            <p className="results-subtitle">Últimos sorteos ejecutados</p>
          </div>
          <div className="results-loading">
            <div className="results-spinner"></div>
            <p>Cargando resultados...</p>
          </div>
        </div>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <section className="results-section">
        <div className="container">
          <div className="results-header">
            <h2 className="results-title">🏆 RESULTADOS</h2>
            <p className="results-subtitle">Últimos sorteos ejecutados</p>
          </div>
          <div className="results-empty">
            <span className="results-empty-icon">📋</span>
            <p>No hay resultados disponibles aún</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="results-section">
      <div className="container">
        <div className="results-header">
          <h2 className="results-title">🏆 RESULTADOS</h2>
          <p className="results-subtitle">Últimos {results.length} sorteos ejecutados</p>
        </div>
        
        <div className="results-grid">
          {results.map((result) => (
            <article key={result.id} className="results-card">
              <div className="results-card-header">
                <span className="results-card-emoji">{getTypeEmoji(result.type)}</span>
                <span className="results-card-type">{getTypeLabel(result.type)}</span>
              </div>
              
              <div className="results-card-body">
                <h3 className="results-card-title">{result.title}</h3>
                <div className="results-card-date">
                  <span className="results-card-date-icon">📅</span>
                  <span>{formatDate(result.executedAt)}</span>
                  <span className="results-card-time">{formatTime(result.executedAt)}</span>
                </div>
              </div>
              
              <div className="results-card-winner">
                <span className="results-card-winner-label">🎉 GANADOR</span>
                <span className="results-card-winner-value">{result.winningItem || "N/A"}</span>
              </div>
            </article>
          ))}
        </div>
        
        <div className="results-footer">
          <Link href="/results" className="results-button">
            VER TODOS LOS RESULTADOS
          </Link>
        </div>
      </div>
    </section>
  );
}
