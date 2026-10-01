// Nanova Cabs - Main Application Logic (Next-Gen Features & Live GPS)

// Known Location Coordinates
const LOCATIONS = {
    "live_gps": { name: "📍 My Current Live Location", lat: 13.0402, lng: 80.2337 }, // Updated dynamically via Geolocation API
    "chennai_central": { name: "Chennai Central Railway Station", lat: 13.0827, lng: 80.2707 },
    "t_nagar": { name: "T. Nagar (Panagal Park)", lat: 13.0402, lng: 80.2337 },
    "airport": { name: "Chennai International Airport", lat: 12.9941, lng: 80.1709 },
    "omr_tech_park": { name: "TIDEL Park, OMR", lat: 12.9892, lng: 80.2483 },
    "velachery": { name: "Velachery Main Bus Stand", lat: 12.9750, lng: 80.2207 },
    "guindy": { name: "Guindy Industrial Estate", lat: 13.0102, lng: 80.2157 },
    "out_pondicherry": { name: "Outstation: Pondicherry", lat: 11.9416, lng: 79.8083 },
    "out_tirupati": { name: "Outstation: Tirupati", lat: 13.6288, lng: 79.4192 }
};

// Cab Categories Base Fares & Per Km Rates
const CAB_RATES = {
    bike: { base: 25, perKm: 8, name: "Nanova Bike" },
    auto: { base: 40, perKm: 12, name: "Nanova Auto" },
    mini: { base: 60, perKm: 16, name: "Nanova Mini" },
    sedan: { base: 90, perKm: 21, name: "Nanova Prime Sedan" },
    ev: { base: 75, perKm: 18, name: "Nanova EV Electric" },
    suv: { base: 140, perKm: 28, name: "Nanova Prime SUV (6 Seater)" }
};

// Hourly Rental Package Base Prices
const RENTAL_PRICES = {
    "1hr": 299,
    "2hr": 549,
    "4hr": 999,
    "8hr": 1899
};

// Global App State
let map = null;
let pickupMarker = null;
let dropMarker = null;
let driverMarker = null;
let routeLine = null;
let selectedCabType = 'auto';
let currentServiceMode = 'daily';
let currentDistanceKm = 12.5;
let discountMultiplier = 1.0;
let isDriverOnline = true;
let rideAnimationTimer = null;
let selectedTipAmount = 0;
let userLiveCoords = { lat: 13.0402, lng: 80.2337 };

// Initial Demo Rides Data for Admin Dashboard
let demoRides = [
    { id: "NNO-9910", customer: "Suresh Kumar", driver: "Karthik Raja", route: "Live GPS → TIDEL Park", category: "Prime Sedan", fare: "₹320", status: "Completed" },
    { id: "NNO-9911", customer: "Priya Ramesh", driver: "Muthu V.", route: "Velachery → Airport", category: "Mini", fare: "₹210", status: "In Progress" },
    { id: "NNO-9912", customer: "Anand Raj", driver: "Gokul S.", route: "Guindy → T. Nagar", category: "Auto", fare: "₹110", status: "Completed" },
    { id: "NNO-9913", customer: "Deepa N.", driver: "Santhosh M.", route: "Airport → OMR Tech Park", category: "EV Electric", fare: "₹260", status: "Completed" }
];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    checkAuthStatus();
    initMap();
    initRideHistory();
    requestUserLocation();
    calculateFaresAndDistance();
    renderAdminRidesTable();
});

// ================= ONE-TIME AUTHENTICATION SYSTEM =================
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('nanova_logged_in');
    const userMobile = localStorage.getItem('nanova_user_mobile') || '+91 98765 43210';

    const authModal = document.getElementById('auth-modal');
    const badge = document.getElementById('user-profile-badge');
    const mobileDisplay = document.getElementById('user-mobile-display');

    if (isLoggedIn === 'true') {
        authModal.classList.add('hidden');
        badge.classList.remove('hidden');
        if (mobileDisplay) mobileDisplay.innerText = userMobile;
    } else {
        authModal.classList.remove('hidden');
        badge.classList.add('hidden');
    }
}

function sendOtp() {
    const mobileVal = document.getElementById('mobile-input').value.trim();
    if (mobileVal.length < 10) {
        alert("Please enter a valid 10-digit mobile number!");
        return;
    }
    document.getElementById('auth-step-1').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('hidden');
}

function verifyOtp() {
    const otpVal = document.getElementById('otp-input').value.trim();
    if (otpVal.length < 4) {
        alert("Please enter the verification OTP!");
        return;
    }

    const mobileVal = document.getElementById('mobile-input').value.trim();
    const fullMobile = `+91 ${mobileVal}`;

    localStorage.setItem('nanova_logged_in', 'true');
    localStorage.setItem('nanova_user_mobile', fullMobile);

    checkAuthStatus();
}

function logoutUser() {
    if (confirm("Do you want to log out from Nanova Cabs?")) {
        localStorage.removeItem('nanova_logged_in');
        document.getElementById('auth-step-1').classList.remove('hidden');
        document.getElementById('auth-step-2').classList.add('hidden');
        checkAuthStatus();
    }
}


// ================= REAL DEVICE GPS GEOLOCATION TRACKING =================
function requestUserLocation() {
    const badge = document.getElementById('gps-status-badge');

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                userLiveCoords = { lat: latitude, lng: longitude };

                // Update LOCATIONS live_gps
                LOCATIONS["live_gps"].lat = latitude;
                LOCATIONS["live_gps"].lng = longitude;

                if (badge) {
                    badge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> GPS Tracked!`;
                    badge.className = "text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1";
                }

                // If pickup is set to live_gps, update marker
                if (document.getElementById('pickup-select').value === 'live_gps') {
                    setPickupMarker(latitude, longitude, "📍 Your Current Live Location");
                    map.setView([latitude, longitude], 13);
                    drawRouteLine();
                    calculateFaresAndDistance();
                }
            },
            (error) => {
                console.warn("Geolocation Error or Denied:", error.message);
                if (badge) {
                    badge.innerHTML = `<i class="fa-solid fa-location-arrow text-cyan-400"></i> GPS Active (Default)`;
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
}


// ================= MAP LOGIC =================
function initMap() {
    const initialLat = userLiveCoords.lat;
    const initialLng = userLiveCoords.lng;

    map = L.map('map', {
        center: [initialLat, initialLng],
        zoom: 12,
        zoomControl: true
    });

    // CartoDB Dark Matter Map Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Initial Markers
    const pLoc = LOCATIONS["live_gps"];
    const dLoc = LOCATIONS["omr_tech_park"];

    setPickupMarker(pLoc.lat, pLoc.lng, pLoc.name);
    setDropMarker(dLoc.lat, dLoc.lng, dLoc.name);
    drawRouteLine();

    // Map Click Listener
    let clickState = 0;
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (clickState === 0) {
            setPickupMarker(lat, lng, "Custom Pickup Spot");
            document.getElementById('map-status').innerText = "Pickup set! Click to set Drop location";
            clickState = 1;
        } else {
            setDropMarker(lat, lng, "Custom Drop Destination");
            document.getElementById('map-status').innerText = "Route updated!";
            clickState = 0;
        }
        calculateFaresAndDistance();
        drawRouteLine();
    });
}

function getPickupIcon() {
    return L.divIcon({
        html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #0b1329; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(16,185,129,0.6);"><i class="fa-solid fa-crosshairs"></i></div>`,
        className: 'custom-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function getDropIcon() {
    return L.divIcon({
        html: `<div style="background-color: #f43f5e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #0b1329; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(244,63,94,0.6);"><i class="fa-solid fa-location-dot"></i></div>`,
        className: 'custom-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function getTaxiIcon() {
    return L.divIcon({
        html: `<div style="background-color: #06b6d4; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #0b1329; display: flex; align-items: center; justify-content: center; color: #0b1329; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(6,182,212,0.8);"><i class="fa-solid fa-taxi"></i></div>`,
        className: 'custom-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

function setPickupMarker(lat, lng, title) {
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker([lat, lng], { icon: getPickupIcon() }).addTo(map);
    pickupMarker.bindPopup(`<b>Pickup Location:</b><br>${title}`).openPopup();
}

function setDropMarker(lat, lng, title) {
    if (dropMarker) map.removeLayer(dropMarker);
    dropMarker = L.marker([lat, lng], { icon: getDropIcon() }).addTo(map);
    dropMarker.bindPopup(`<b>Drop Destination:</b><br>${title}`);
}

function updateLocationsFromSelect() {
    const pKey = document.getElementById('pickup-select').value;
    const dKey = document.getElementById('drop-select').value;

    const pLoc = LOCATIONS[pKey];
    const dLoc = LOCATIONS[dKey];

    if (pLoc && dLoc) {
        setPickupMarker(pLoc.lat, pLoc.lng, pLoc.name);
        setDropMarker(dLoc.lat, dLoc.lng, dLoc.name);
        drawRouteLine();
        calculateFaresAndDistance();
    }
}

function drawRouteLine() {
    if (!pickupMarker || !dropMarker) return;

    const pLatLng = pickupMarker.getLatLng();
    const dLatLng = dropMarker.getLatLng();

    if (routeLine) map.removeLayer(routeLine);

    const latlngs = [
        [pLatLng.lat, pLatLng.lng],
        [pLatLng.lat + (dLatLng.lat - pLatLng.lat) * 0.5 + 0.005, pLatLng.lng + (dLatLng.lng - pLatLng.lng) * 0.5 - 0.005],
        [dLatLng.lat, dLatLng.lng]
    ];

    routeLine = L.polyline(latlngs, {
        color: '#06b6d4',
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8'
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.max(2.5, Math.round(d * 1.3 * 10) / 10);
}

function calculateFaresAndDistance() {
    if (!pickupMarker || !dropMarker) return;

    const p = pickupMarker.getLatLng();
    const d = dropMarker.getLatLng();

    currentDistanceKm = calculateDistance(p.lat, p.lng, d.lat, d.lng);
    const estMinutes = Math.round(currentDistanceKm * 2.2);

    document.getElementById('est-distance').innerText = `${currentDistanceKm} km`;
    document.getElementById('est-time').innerText = `${estMinutes} mins`;

    if (currentServiceMode === 'rental') {
        const pkgKey = document.getElementById('rental-package').value;
        const basePkgPrice = RENTAL_PRICES[pkgKey] || 999;

        for (const [key] of Object.entries(CAB_RATES)) {
            let mult = 1.0;
            if (key === 'bike') mult = 0.4;
            if (key === 'auto') mult = 0.6;
            if (key === 'sedan') mult = 1.3;
            if (key === 'suv') mult = 1.8;

            const finalFare = Math.round(basePkgPrice * mult * discountMultiplier);
            const priceEl = document.getElementById(`price-${key}`);
            if (priceEl) priceEl.innerText = `₹${finalFare}`;
        }
    } else {
        for (const [key, cab] of Object.entries(CAB_RATES)) {
            const rawFare = cab.base + (currentDistanceKm * cab.perKm);
            const finalFare = Math.round(rawFare * discountMultiplier);
            const priceEl = document.getElementById(`price-${key}`);
            if (priceEl) priceEl.innerText = `₹${finalFare}`;
        }
    }
}

function selectServiceMode(mode) {
    currentServiceMode = mode;
    document.querySelectorAll('.service-mode-btn').forEach(btn => btn.classList.remove('active-service', 'text-slate-100'));

    const activeBtn = document.getElementById(`service-${mode}`);
    if (activeBtn) activeBtn.classList.add('active-service');

    const rentalBox = document.getElementById('rental-package-box');
    const dropoffBox = document.getElementById('dropoff-container');
    const catLabel = document.getElementById('active-category-label');

    if (mode === 'rental') {
        rentalBox.classList.remove('hidden');
        dropoffBox.classList.add('hidden');
        if (catLabel) catLabel.innerText = "Hourly Rental Rides";
    } else if (mode === 'outstation') {
        rentalBox.classList.add('hidden');
        dropoffBox.classList.remove('hidden');
        if (catLabel) catLabel.innerText = "Outstation Intercity";
        document.getElementById('drop-select').value = "out_pondicherry";
        updateLocationsFromSelect();
    } else if (mode === 'ev') {
        rentalBox.classList.add('hidden');
        dropoffBox.classList.remove('hidden');
        if (catLabel) catLabel.innerText = "100% Electric EV Fleet";
        selectCab('ev');
    } else {
        rentalBox.classList.add('hidden');
        dropoffBox.classList.remove('hidden');
        if (catLabel) catLabel.innerText = "Daily City Rides";
        selectCab('auto');
    }

    calculateFaresAndDistance();
}

function toggleRiderMode(mode) {
    const meBtn = document.getElementById('rider-me');
    const guestBtn = document.getElementById('rider-guest');
    const guestBox = document.getElementById('guest-details-box');

    if (mode === 'guest') {
        guestBtn.className = "px-2.5 py-1 rounded-md font-semibold bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950";
        meBtn.className = "px-2.5 py-1 rounded-md font-semibold text-slate-400 hover:text-white";
        guestBox.classList.remove('hidden');
    } else {
        meBtn.className = "px-2.5 py-1 rounded-md font-semibold bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950";
        guestBtn.className = "px-2.5 py-1 rounded-md font-semibold text-slate-400 hover:text-white";
        guestBox.classList.add('hidden');
    }
}

function toggleScheduleBox() {
    const isChecked = document.getElementById('schedule-check').checked;
    const pickerBox = document.getElementById('schedule-picker-box');
    if (isChecked) {
        pickerBox.classList.remove('hidden');
    } else {
        pickerBox.classList.add('hidden');
    }
}

function applyCoupon() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const msg = document.getElementById('coupon-msg');

    if (code === 'NANOVA50' || code === 'FIRST20') {
        discountMultiplier = 0.8;
        msg.classList.remove('hidden');
        msg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Coupon ${code} Applied! 20% Discount added.`;
    } else {
        discountMultiplier = 1.0;
        msg.classList.remove('hidden');
        msg.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-400"></i> Invalid Code. Try NANOVA50 for 20% OFF!`;
    }

    calculateFaresAndDistance();
}

function selectCab(cabType) {
    selectedCabType = cabType;
    document.querySelectorAll('.cab-card').forEach(card => {
        card.classList.remove('selected-cab', 'border-cyan-400', 'bg-slate-950');
        card.classList.add('border-slate-800', 'bg-slate-950');
    });

    const activeCard = document.getElementById(`cab-${cabType}`);
    if (activeCard) {
        activeCard.classList.add('selected-cab', 'border-cyan-400', 'bg-slate-950');
    }
}

function confirmRideBooking() {
    const statusCard = document.getElementById('status-card');
    const searchingOverlay = document.getElementById('searching-driver');
    const driverAssigned = document.getElementById('driver-assigned');

    statusCard.classList.remove('hidden');
    searchingOverlay.classList.remove('hidden');
    driverAssigned.classList.add('hidden');

    statusCard.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
        searchingOverlay.classList.add('hidden');
        driverAssigned.classList.remove('hidden');

        const randomOtp = Math.floor(1000 + Math.random() * 9000);
        document.getElementById('ride-otp').innerText = randomOtp;

        startDriverSimulation();

        const pickupName = document.getElementById('pickup-select').selectedOptions[0]?.text || "Live Location";
        const dropName = document.getElementById('drop-select').selectedOptions[0]?.text || "Destination";
        const fareText = document.getElementById(`price-${selectedCabType}`).innerText;

        let riderName = localStorage.getItem('nanova_user_mobile') || "You (Demo User)";
        if (!document.getElementById('guest-details-box').classList.contains('hidden')) {
            const guestVal = document.getElementById('guest-name').value;
            if (guestVal) riderName = `${guestVal} (Guest)`;
        }

        const newRide = {
            id: `NNO-${Math.floor(1000 + Math.random() * 9000)}`,
            customer: riderName,
            driver: "Karthik Raja",
            route: `${pickupName.split('(')[0]} → ${dropName.split('(')[0]}`,
            category: CAB_RATES[selectedCabType].name,
            fare: fareText,
            status: "In Progress"
        };

        demoRides.unshift(newRide);
        saveRideHistory();
        renderAdminRidesTable();

    }, 2200);
}

function startDriverSimulation() {
    if (!pickupMarker || !dropMarker) return;

    if (driverMarker) map.removeLayer(driverMarker);
    if (rideAnimationTimer) clearInterval(rideAnimationTimer);

    const pLatLng = pickupMarker.getLatLng();
    const dLatLng = dropMarker.getLatLng();

    let currentStep = 0;
    const totalSteps = 100;

    driverMarker = L.marker([pLatLng.lat - 0.008, pLatLng.lng - 0.008], { icon: getTaxiIcon() }).addTo(map);

    rideAnimationTimer = setInterval(() => {
        currentStep++;
        const progress = currentStep / totalSteps;

        const curLat = (pLatLng.lat - 0.008) + (dLatLng.lat - (pLatLng.lat - 0.008)) * progress;
        const curLng = (pLatLng.lng - 0.008) + (dLatLng.lng - (pLatLng.lng - 0.008)) * progress;

        driverMarker.setLatLng([curLat, curLng]);

        const pct = Math.min(100, Math.round(progress * 100));
        document.getElementById('trip-progress-bar').style.width = `${pct}%`;
        document.getElementById('trip-percentage').innerText = `${pct}%`;

        if (pct < 30) {
            document.getElementById('trip-progress-text').innerText = "Driver arriving at your live GPS pickup spot...";
        } else if (pct < 95) {
            document.getElementById('trip-progress-text').innerText = "On the way to destination!";
        } else {
            document.getElementById('trip-progress-text').innerText = "Arrived at destination! Ride Completed.";
            document.getElementById('driver-eta').innerText = "Arrived!";
            clearInterval(rideAnimationTimer);

            setTimeout(() => {
                document.getElementById('rating-modal').classList.remove('hidden');
            }, 800);
        }
    }, 300);
}

function cancelRide() {
    if (confirm("Are you sure you want to cancel this ride?")) {
        document.getElementById('status-card').classList.add('hidden');
        if (driverMarker) map.removeLayer(driverMarker);
        if (rideAnimationTimer) clearInterval(rideAnimationTimer);
    }
}

function openSafetyModal() {
    document.getElementById('safety-modal').classList.remove('hidden');
}

function closeSafetyModal() {
    document.getElementById('safety-modal').classList.add('hidden');
}

function triggerEmergencySOS() {
    alert("🚨 EMERGENCY SOS ACTIVATED!\nLive GPS Location & Ride details sent to Emergency Response Team.");
    closeSafetyModal();
}

function shareLiveLocation() {
    alert("🔗 Live GPS Tracking Link copied to clipboard!\nShare this link with family to track your ride in real-time.");
    closeSafetyModal();
}

function selectTip(amount) {
    selectedTipAmount = amount;
    document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active-tip'));
    event.target.classList.add('active-tip');
}

function submitRating() {
    alert(`Thank you for rating 5 Stars! Tip of ₹${selectedTipAmount} added for Karthik Raja.`);
    document.getElementById('rating-modal').classList.add('hidden');
    document.getElementById('status-card').classList.add('hidden');
}

function toggleDriverDuty() {
    isDriverOnline = !isDriverOnline;
    const btn = document.getElementById('driver-status-btn');
    if (isDriverOnline) {
        btn.className = "bg-emerald-500 text-slate-950 font-extrabold px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow transition-all";
        btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span> ONLINE`;
        document.getElementById('driver-request-box').classList.remove('hidden');
    } else {
        btn.className = "bg-slate-700 text-slate-300 font-extrabold px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all";
        btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span> OFFLINE`;
        document.getElementById('driver-request-box').classList.add('hidden');
    }
}

function acceptTrip() {
    alert("Trip Accepted! Navigating to customer location...");
    switchTab('booking');
}

function rejectTrip() {
    document.getElementById('driver-request-box').classList.add('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-tab');
        btn.classList.add('text-slate-400');
    });

    const activeSec = document.getElementById(`tab-${tabId}`);
    if (activeSec) activeSec.classList.remove('hidden');

    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('active-tab');
        activeBtn.classList.remove('text-slate-400');
    }

    if (tabId === 'booking' && map) {
        setTimeout(() => map.invalidateSize(), 200);
    }
}

function initRideHistory() {
    const saved = localStorage.getItem('nanova_cab_rides');
    if (saved) {
        try {
            demoRides = JSON.parse(saved);
        } catch (e) {
            console.error("Error reading saved rides", e);
        }
    }
}

function saveRideHistory() {
    localStorage.setItem('nanova_cab_rides', JSON.stringify(demoRides));
}

function renderAdminRidesTable() {
    const tbody = document.getElementById('admin-rides-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    demoRides.forEach(ride => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-950/50 transition";

        let statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        if (ride.status === "In Progress") {
            statusClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
        }

        tr.innerHTML = `
            <td class="p-3 font-mono text-xs text-slate-400">${ride.id}</td>
            <td class="p-3 font-semibold text-white">${ride.customer}</td>
            <td class="p-3 text-slate-300">${ride.driver}</td>
            <td class="p-3 text-slate-300 text-xs">${ride.route}</td>
            <td class="p-3 text-xs text-cyan-300 font-medium">${ride.category}</td>
            <td class="p-3 font-bold text-emerald-400">${ride.fare}</td>
            <td class="p-3">
                <span class="text-[10px] px-2.5 py-1 rounded-full border font-semibold ${statusClass}">
                    ${ride.status}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function refreshAdminTable() {
    renderAdminRidesTable();
}

function resetDemoData() {
    localStorage.removeItem('nanova_cab_rides');
    localStorage.removeItem('nanova_logged_in');
    localStorage.removeItem('nanova_user_mobile');
    location.reload();
}
