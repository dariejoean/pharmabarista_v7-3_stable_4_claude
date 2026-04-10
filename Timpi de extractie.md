# Documentație Tehnică: Calculul Timpilor de Extracție

Această documentație detaliază mecanismele interne de calcul al timpilor de extracție în PharmaBarista v7.3. Sistemul este proiectat pentru a oferi precizie ridicată prin compensarea latenței hardware și utilizarea unor surse de timp stabile.

## 1. Arhitectura Cronometrului
Cronometrul aplicației este ancorat la `Date.now()` pentru a elimina drift-ul (deriva) cauzat de utilizarea `setInterval` sau a altor mecanisme bazate pe tick-uri de browser, care pot fi instabile.

*   **Sursa de timp:** `performance.now()` sau `Date.now()` pentru precizie milisecundă.
*   **Compensarea latenței:** Se utilizează constanta `SCALE_LATENCY_S` (de obicei 0.5s - 1.0s) pentru a compensa întârzierea între momentul în care espressorul începe extracția și momentul în care senzorii (cântar/presiune) raportează datele prin Bluetooth.

## 2. Definiții și Formule de Calcul

Toți timpii sunt calculați în secunde (s) cu o precizie de 0.1s.

*   **Timp de pre-extracție (TPE):**
    *   *Definiție:* Durata de la pornirea cronometrului până la detectarea primului flux de cafea.
    *   *Calcul:* `TPE = (Timp_Detectare_Flux_Start - Timp_Start) - SCALE_LATENCY_S`
    *   *Notă:* Dacă valoarea rezultată este negativă, se forțează la 0.

*   **Timp de extracție efectivă (TEE):**
    *   *Definiție:* Durata în care cafeaua curge efectiv în ceașcă.
    *   *Calcul:* `TEE = (Timp_Detectare_Flux_Stop - Timp_Detectare_Flux_Start) - SCALE_LATENCY_S`

*   **Timp standard de extracție (TSE):**
    *   *Definiție:* Timpul de la pornirea cronometrului până la detectarea căderii de presiune (sfârșitul extracției).
    *   *Calcul:* `TSE = (Timp_Detectare_Cădere_Presiune - Timp_Start) - SCALE_LATENCY_S`
    *   *Noutate v7.3:* Calculat automat pentru extracții începând cu 01.04.2026.

*   **Timp total de extracție (TTE):**
    *   *Definiție:* Suma timpului de pre-extracție și a timpului de extracție efectivă.
    *   *Calcul:* `TTE = TPE + TEE`

*   **Timp total cronometrat (TTC):**
    *   *Definiție:* Durata totală de funcționare a cronometrului, de la start până la oprirea manuală sau automată.

## 3. Mecanisme de Detecție

Aplicația utilizează algoritmi de procesare a semnalului în timp real pentru a detecta fazele extracției:

1.  **Detectare Flux (Start/Stop):**
    *   Se monitorizează variația greutății (`currentWeight`).
    *   Un flux este considerat "pornit" când variația greutății depășește un prag minim într-un interval de timp scurt.
    *   Un flux este considerat "oprit" când variația greutății devine nulă sau sub pragul de zgomot pentru o perioadă definită.

2.  **Detectare Cădere Presiune (Standard Extraction Time):**
    *   Se monitorizează presiunea (`currentPressure`).
    *   Se utilizează un algoritm EMA (Exponential Moving Average) pentru a netezi zgomotul senzorului.
    *   Căderea de presiune este detectată când derivata presiunii devine negativă și depășește un prag de sensibilitate, indicând închiderea manetei sau epuizarea extracției.

---

## 4. Stabilitate și Validare (v7.3)

Pentru a asigura corectitudinea datelor calculate, PharmaBarista v7.3 introduce:
*   **Validarea Datelor:** Toate câmpurile numerice (inclusiv timpii) sunt validate pentru a preveni valori negative sau invalide.
*   **ErrorBoundary:** În cazul unei erori în timpul procesării sau afișării timpilor de extracție, `ErrorBoundary` previne blocarea aplicației.
*   **Feedback:** Stări de încărcare și mesaje de eroare clare pentru utilizator.

---
*Această logică asigură o monitorizare precisă și reproductibilă a extracțiilor, indiferent de latențele variabile ale conexiunii Bluetooth.*
