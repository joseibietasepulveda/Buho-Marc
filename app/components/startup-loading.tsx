import type { CSSProperties } from "react";
import styles from "./startup-loading.module.css";

const words = ["BUHO", "MARC"];

export default function StartupLoading() {
  return (
    <main className={styles.screen} aria-busy="true">
      <div className={styles.content}>
        <div className={styles.wordmark} aria-label="BUHO MARC">
          {words.map((word, wordIndex) => (
            <span className={styles.word} key={word} aria-hidden="true">
              {Array.from(word).map((letter, letterIndex) => (
                <span
                  className={styles.letter}
                  key={`${word}-${letterIndex}`}
                  style={{
                    "--letter-delay": `${(wordIndex * 4 + letterIndex) * 0.09}s`,
                  } as CSSProperties}
                >
                  {letter}
                </span>
              ))}
            </span>
          ))}
        </div>
        <p className={styles.tagline}>Vigilancia y gestión de marcas</p>
        <div className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.status} role="status">Cargando tu cartera…</p>
      </div>
    </main>
  );
}
