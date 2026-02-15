import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.hero} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <h1 className={styles.title} style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                    Schülerkartei
                </h1>
                <p className={styles.subtitle} style={{ marginBottom: '2rem', opacity: 0.7 }}>
                    Internes Verwaltungssystem für Standorte und Lehrkräfte.
                </p>

                <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', textDecoration: 'none' }}>
                    Zum Dashboard
                </Link>
            </div>
        </main>
    );
}
