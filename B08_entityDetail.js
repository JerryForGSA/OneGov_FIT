/**
 * OneGov FIT Market - Entity Detail Backend Functions
 * Backend functions for entity detail modal operations
 */

/**
 * Generate carousel slides for entity detail view
 */
function generateDetailSlides(entity, entityData) {
    const slides = [];
    
    // Slide 1: Fiscal Year Obligations Overview
    if (entityData.fiscalYearData && Object.keys(entityData.fiscalYearData).length > 0) {
        slides.push(createFiscalYearSlide(entity, entityData.fiscalYearData));
    }
    
    // Slide 2: Tier Analysis
    if (entityData.tierData && Object.keys(entityData.tierData).length > 0) {
        slides.push(createTierAnalysisSlide(entity, entityData.tierData));
    }
    
    // Slide 3: Top Agencies/Customers
    if (entityData.agencyData && Object.keys(entityData.agencyData).length > 0) {
        slides.push(createTopAgenciesSlide(entity, entityData.agencyData));
    }
    
    // Slide 4: Contract Vehicles
    if (entityData.contractData && Object.keys(entityData.contractData).length > 0) {
        slides.push(createContractVehicleSlide(entity, entityData.contractData));
    }
    
    // Slide 5: Reseller Network
    if (entityData.resellerData && Object.keys(entityData.resellerData).length > 0) {
        slides.push(createResellerSlide(entity, entityData.resellerData));
    }
    
    // If no data available, show a default slide
    if (slides.length === 0) {
        slides.push(createDefaultSlide(entity));
    }
    
    return slides.join('');
}

/**
 * Create fiscal year obligations slide
 */
function createFiscalYearSlide(entity, fiscalData) {
    const fiscalYearChart = generateSimpleBarChart(fiscalData, 'Fiscal Year Obligations');
    
    return `
        <div class="detail-slide" style="min-width: 100%; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
            <h3 style="color: var(--dark-blue); font-weight: 600; margin-bottom: 20px; font-size: 1.3rem;">
                📊 Fiscal Year Obligations Trend
            </h3>
            <div style="height: 300px;">
                ${fiscalYearChart}
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--bg-light);">
                <p style="color: var(--blue); font-size: 0.95rem; text-align: center;">
                    📈 Total obligations across all tracked fiscal years for ${entity.name}
                </p>
            </div>
        </div>
    `;
}

/**
 * Create tier analysis slide
 */
function createTierAnalysisSlide(entity, tierData) {
    const tierChart = generateHorizontalBarChart(tierData, 'Tier Distribution');
    
    return `
        <div class="detail-slide" style="min-width: 100%; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
            <h3 style="color: var(--dark-blue); font-weight: 600; margin-bottom: 20px; font-size: 1.3rem;">
                🎯 Tier Performance Analysis
            </h3>
            <div style="height: 300px;">
                ${tierChart}
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--bg-light);">
                <p style="color: var(--blue); font-size: 0.95rem; text-align: center;">
                    🏆 Distribution of obligations across different contract tiers
                </p>
            </div>
        </div>
    `;
}

/**
 * Create top agencies slide
 */
function createTopAgenciesSlide(entity, agencyData) {
    const agencyChart = generateFunnelChart(agencyData, 'Top Agencies', true, true);
    
    return `
        <div class="detail-slide" style="min-width: 100%; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
            <h3 style="color: var(--dark-blue); font-weight: 600; margin-bottom: 20px; font-size: 1.3rem;">
                🏛️ Top Government Agency Customers
            </h3>
            <div style="height: 400px;">
                ${agencyChart}
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--bg-light);">
                <p style="color: var(--blue); font-size: 0.95rem; text-align: center;">
                    🤝 Primary government agencies partnering with ${entity.name}
                </p>
            </div>
        </div>
    `;
}

/**
 * Create contract vehicle slide
 */
function createContractVehicleSlide(entity, contractData) {
    const contractChart = generatePieChart(contractData, 'Contract Vehicles');
    
    return `
        <div class="detail-slide" style="min-width: 100%; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
            <h3 style="color: var(--dark-blue); font-weight: 600; margin-bottom: 20px; font-size: 1.3rem;">
                📋 Contract Vehicle Distribution
            </h3>
            <div style="height: 300px; display: flex; align-items: center; justify-content: center;">
                ${contractChart}
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--bg-light);">
                <p style="color: var(--blue); font-size: 0.95rem; text-align: center;">
                    📄 Contract vehicles utilized by ${entity.name} for government sales
                </p>
            </div>
        </div>
    `;
}

/**
 * Create reseller network slide
 */
function createResellerSlide(entity, resellerData) {
    const resellerChart = generateFunnelChart(resellerData, 'Reseller Network', false, true);
    
    return `
        <div class="detail-slide" style="min-width: 100%; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
            <h3 style="color: var(--dark-blue); font-weight: 600; margin-bottom: 20px; font-size: 1.3rem;">
                🏪 Partner & Reseller Network
            </h3>
            <div style="height: 400px;">
                ${resellerChart}
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--bg-light);">
                <p style="color: var(--blue); font-size: 0.95rem; text-align: center;">
                    🤝 Key reseller partnerships driving ${entity.name}'s market presence
                </p>
            </div>
        </div>
    `;
}

/**
 * Create default slide when no data is available
 */
function createDefaultSlide(entity) {
    return `
        <div class="detail-slide" style="min-width: 100%; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); text-align: center;">
            <h3 style="color: var(--dark-blue); font-weight: 600; margin-bottom: 20px; font-size: 1.3rem;">
                📊 ${entity.name} Overview
            </h3>
            <div style="height: 300px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px;">
                <div style="font-size: 3rem; color: var(--orange); opacity: 0.7;">📈</div>
                <div style="color: var(--blue); font-size: 1.1rem; max-width: 400px; line-height: 1.6;">
                    <strong>${entity.name}</strong> is a key player in the government technology marketplace.
                </div>
                <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; color: var(--dark-blue);">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--orange); margin-bottom: 4px;">
                        ${formatCurrencyShort(entity.totalObligations || 0)}
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">Total Government Obligations</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--bg-light);">
                <p style="color: var(--blue); font-size: 0.95rem;">
                    🔍 Detailed analytics will appear as more data becomes available
                </p>
            </div>
        </div>
    `;
}

/**
 * Initialize carousel functionality for detail view
 */
function initializeDetailCarousel() {
    window.currentDetailSlide = 0;
    const slides = document.querySelectorAll('.detail-slide');
    const track = document.getElementById('detail-carousel-track');
    const indicatorsContainer = document.getElementById('detail-indicators');
    
    if (!slides.length || !track || !indicatorsContainer) return;
    
    // Create indicators
    indicatorsContainer.innerHTML = '';
    slides.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            width: 8px; 
            height: 8px; 
            border-radius: 50%; 
            background: ${index === 0 ? 'var(--orange)' : 'rgba(255,255,255,0.5)'}; 
            cursor: pointer;
            transition: background 0.3s ease;
        `;
        indicator.onclick = () => goToDetailSlide(index);
        indicatorsContainer.appendChild(indicator);
    });
    
    updateDetailSlidePosition();
}

/**
 * Navigate to specific slide
 */
function goToDetailSlide(slideIndex) {
    const slides = document.querySelectorAll('.detail-slide');
    if (slideIndex < 0 || slideIndex >= slides.length) return;
    
    window.currentDetailSlide = slideIndex;
    updateDetailSlidePosition();
}

/**
 * Go to previous slide
 */
function prevDetailSlide() {
    const slides = document.querySelectorAll('.detail-slide');
    const newIndex = window.currentDetailSlide > 0 ? window.currentDetailSlide - 1 : slides.length - 1;
    goToDetailSlide(newIndex);
}

/**
 * Go to next slide
 */
function nextDetailSlide() {
    const slides = document.querySelectorAll('.detail-slide');
    const newIndex = window.currentDetailSlide < slides.length - 1 ? window.currentDetailSlide + 1 : 0;
    goToDetailSlide(newIndex);
}

/**
 * Update slide position and indicators
 */
function updateDetailSlidePosition() {
    const track = document.getElementById('detail-carousel-track');
    const indicators = document.querySelectorAll('#detail-indicators > div');
    
    if (!track || !indicators.length) return;
    
    const offset = window.currentDetailSlide * 100;
    track.style.transform = `translateX(-${offset}%)`;
    
    indicators.forEach((indicator, index) => {
        indicator.style.background = index === window.currentDetailSlide ? 'var(--orange)' : 'rgba(255,255,255,0.5)';
    });
}