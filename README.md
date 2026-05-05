# Futtatási útmutató - Telemedicina Webalkalmazás

Ez a dokumentum a szakdolgozat mellékletét képező Telemedicina webalkalmazás helyi futtatásához szükséges lépéseket tartalmazza.

## Alkalmazott technológiák

*   **Frontend:** Angular 19.2+, Ionic 8.5+ (Mobil-barát hibrid felület)
*   **Backend:** Node.js (Express keretrendszer)
*   **Adatbázis és Hitelesítés:** Supabase (PostgreSQL felhő alapú szolgáltatás)
*   **Egyéb könyvtárak:** 
    *   **Crypto-JS:** Adatbiztonság és kliensoldali titkosítás
    *   **jsPDF:** Orvosi leletek és dokumentumok generálása

## Előfeltételek

A rendszer futtatásához a következő szoftverek telepítése szükséges:
*   **Node.js:** v18.0.0
*   **npm:** Node Package Manager

## Telepítés és indítás

### 1. Függőségek telepítése
A projekt három szinten kezeli a függőségeket. A gyökérkönyvtárban, valamint a frontend és backend mappákban is futtatni kell a telepítést:

```bash
# Gyökérkönyvtárban
npm install

# Frontend mappában
cd frontend
npm install

# Backend mappában
cd ../backend
npm install
