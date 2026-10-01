# Nanova Cabs - Next-Gen Taxi Booking & Fleet Management Web Application

A modern, feature-packed Taxi Booking and Fleet Management web application built for **Nanova Incubation**.

## 🌐 LIVE DEMO URL (Vercel Deployed)
👉 **[https://nanova-cabs.vercel.app](https://nanova-cabs.vercel.app)**

---

## 🚀 How to Run Locally
1. Simply double-click on `index.html` to open it in any web browser (Chrome, Edge, Firefox, Brave, Safari).
2. Alternatively, run a lightweight local web server in this directory:
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

## 🚖 Key Features & Capabilities Included
1. **One-Time Mobile OTP Authentication**:
   - Clean mobile verification login modal on first app launch (`localStorage` session persistence).
2. **Automatic Live GPS Location Tracking**:
   - Automatically tracks device GPS coordinates using Browser Geolocation API as the default pickup location.
3. **Service Categories**:
   - 🏙️ **Daily City Rides**: Bike, Auto, Mini, Prime Sedan, Prime SUV.
   - ⏱️ **Hourly Rentals**: Packages (1 Hr / 2 Hrs / 4 Hrs / 8 Hrs).
   - 🛣️ **Outstation Intercity**: Pondicherry, Tirupati, etc.
   - ⚡ **Nanova EV Cabs**: 100% Electric, Zero-emission cabs.
4. **Flexible Rider Modes**:
   - **"Book for Me" vs "Book for Someone Else"** (guest rider name & phone details).
   - **Ride Now** vs **Schedule Ride for Later** (date/time picker).
5. **Coupons & Offers Box**:
   - Enter promo code `NANOVA50` or `FIRST20` for instant 20% fare discount.
6. **24x7 Safety Shield & SOS Center**:
   - Emergency SOS Alert trigger button & Live GPS tracking link generator.
7. **Driver Tip & Rating System**:
   - Post-ride 5-Star rating modal & Driver tipping options (+₹20, +₹50, +₹100).
8. **Live GPS Radar & Ride Simulation**:
   - Animated driver cab movement along route line on map with real-time ETA and OTP.
9. **Driver Console & Admin Fleet Dashboard**:
   - Online/Offline duty switch, incoming trip alerts, and real-time revenue analytics logs.
