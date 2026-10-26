import { formatCurrency } from '../assets/js/ui.js';

/**
 * Creates an accessible, safe Property Card DOM element without innerHTML injection.
 */
export function createPropertyCard(property) {
  const card = document.createElement('article');
  card.className = 'property-card';
  card.setAttribute('aria-label', property.title);

  // 1. Media
  const media = document.createElement('div');
  media.className = 'card-media';

  const img = document.createElement('img');
  const fallbackSvg = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%2394a3b8%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2220%22%20font-family%3Asans-serif%3EProperty%20Photo%3C%2Ftext%3E%3C%2Fsvg%3E';
  const imageUrl = property.images && property.images.length > 0
    ? property.images[0].url
    : fallbackSvg;

  img.src = imageUrl;
  img.alt = property.title || 'Property image';
  img.loading = 'lazy';
  img.onerror = () => {
    img.src = fallbackSvg;
  };
  media.appendChild(img);

  // Badges
  const badges = document.createElement('div');
  badges.className = 'card-badges';

  const purposeBadge = document.createElement('span');
  purposeBadge.className = `badge badge-${property.purpose === 'rent' ? 'rent' : 'sale'}`;
  purposeBadge.textContent = property.purpose === 'rent' ? 'For Rent' : 'For Sale';
  badges.appendChild(purposeBadge);

  const typeBadge = document.createElement('span');
  typeBadge.className = 'badge badge-status';
  typeBadge.textContent = (property.propertyType || '').toUpperCase();
  badges.appendChild(typeBadge);

  media.appendChild(badges);
  card.appendChild(media);

  // 2. Card Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const price = document.createElement('div');
  price.className = 'card-price';
  price.textContent = formatCurrency(property.price, property.purpose);
  body.appendChild(price);

  const title = document.createElement('h3');
  title.className = 'card-title';
  const titleLink = document.createElement('a');
  titleLink.href = `/pages/details.html?id=${encodeURIComponent(property._id)}`;
  titleLink.textContent = property.title;
  title.appendChild(titleLink);
  body.appendChild(title);

  const location = document.createElement('div');
  location.className = 'card-location';
  location.textContent = `📍 ${property.locality || ''}, ${property.city || ''}`;
  body.appendChild(location);

  const features = document.createElement('div');
  features.className = 'card-features';

  if (property.bedrooms !== undefined && property.propertyType !== 'plot' && property.propertyType !== 'commercial') {
    const beds = document.createElement('span');
    beds.textContent = `🛏️ ${property.bedrooms} Beds`;
    features.appendChild(beds);
  }

  if (property.bathrooms !== undefined && property.propertyType !== 'plot' && property.propertyType !== 'commercial') {
    const baths = document.createElement('span');
    baths.textContent = `🚿 ${property.bathrooms} Baths`;
    features.appendChild(baths);
  }

  if (property.area) {
    const area = document.createElement('span');
    area.textContent = `📐 ${property.area} ${property.areaUnit || 'sqft'}`;
    features.appendChild(area);
  }

  body.appendChild(features);
  card.appendChild(body);

  return card;
}
