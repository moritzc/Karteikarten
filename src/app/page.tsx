import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.hero}>
                <div className={styles.glow}></div>
                <h1 className={styles.title}>
                    LernKartei <br />
                    <span style={{ fontSize: '2rem', opacity: 0.8, background: 'none', WebkitBackgroundClip: 'unset', color: 'var(--foreground)' }}>
                        Digitales Schülermanagement
                    </span>
                </h1>
                <p className={styles.subtitle}>
                    Die moderne Lösung für Standorte, Lehrkräfte und Schülerverwaltung.
                    Einfach, effizient und übersichtlich.
                </p>

                <Link href="/dashboard" className={styles.loginBtn}>
                    Zum Dashboard →
                </Link>
            </div>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        Für Standortleitungen
                    </h2>
                    <p className={styles.cardDescription}>
                        Verwalten Sie Schüler, Lehrer und Pläne für Ihren Standort.
                        Tagespläne und Notizen im Überblick.
                    </p>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        Für Lehrkräfte
                    </h2>
                    <p className={styles.cardDescription}>
                        Digitale Karteikarten mobil ausfüllen. Schnelle Eingabe von Noten, Themen und Schularbeiten.
                    </p>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>
                        Administration
                    </h2>
                    <p className={styles.cardDescription}>
                        Systemweite Verwaltung von Standorten und Benutzern.
                        Datenexport und Konfiguration.
                    </p>
                </div>
            </div>
        </main>
    );
}
