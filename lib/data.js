// app/lib/data.js
// ─────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all mock data in Netlodge
// Every page imports from here — no more scattered mock data
// When you connect a real backend, you only change this file
// ─────────────────────────────────────────────────────────────

// ── ROOM IMAGE POOLS ─────────────────────────────────────────
// Placeholder Unsplash imagery grouped by room type. Swap these
// for real property photography before production — verify each
// URL still resolves, since Unsplash occasionally retires photos.
const GATE_IMAGES = {
  'prop-1': { url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', alt: 'Sunrise Hostel building exterior and front gate' },
  'prop-2': { url: 'https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=1200&q=80', alt: 'Greenfield Lodge building exterior and front gate' },
  'prop-3': { url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80', alt: 'Campus View Hostel building exterior and front gate' },
}

const IMAGE_POOLS = {
  Single: [
    { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', alt: 'Single bed with neutral bedding beside a window' },
    { url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80', alt: 'Compact study desk against the wall' },
    { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80', alt: 'Built-in wardrobe and storage space' },
    { url: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80', alt: 'Study desk with lamp and chair' },
  ],
  Shared: [
    { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80', alt: 'Shared bedroom with two beds' },
    { url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80', alt: 'Shared common living space' },
    { url: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80', alt: 'Communal seating area' },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80', alt: 'Shared study desk area' },
  ],
  'Self-Contain': [
    { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80', alt: 'Self-contained room with double bed' },
    { url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80', alt: 'En-suite bathroom with shower' },
    { url: 'https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=1200&q=80', alt: 'Studio-style living and sleeping area' },
    { url: 'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?auto=format&fit=crop&w=1200&q=80', alt: 'Private desk and workspace corner' },
  ],
}

// Builds a room-specific images array from the shared type pool,
// tagging each image with a unique id scoped to this room.
function roomImages(type, roomId) {
  const pool = IMAGE_POOLS[type] || IMAGE_POOLS.Single
  return pool.map((image, index) => ({
    id: `${roomId}-img-${index + 1}`,
    url: image.url,
    alt: image.alt,
  }))
}

// ── PROPERTIES ───────────────────────────────────────────────
// Each property contains blocks
// Each block contains rooms
// Rooms belong to ONE property only

export const PROPERTIES = [
  {
    id:               'prop-1',
    name:             'Sunrise Hostel',
    university:       'University of Abuja',
    city:             'Abuja',
    address:          'Plot 34, Gwagwalada, Abuja FCT',
    distanceToGate:   '5 mins walk',
    distanceToMarket: '10 mins walk',
    distanceToFaculty:'8 mins walk',
    totalRooms:       120,
    verified:         true,
    amenities:        ['24hr Power', 'WiFi', 'Borehole Water', '24hr Security', 'CCTV', 'Parking'],
    gateImage:        GATE_IMAGES['prop-1'],
    rules: [
      'No loud music after 10pm',
      'No visitors after midnight',
      'Keep common areas clean',
      'No cooking in rooms',
    ],
    landlord: {
      name:               'Mr. Emeka Okafor',
      verified:           true,
      responseTime:       'Usually responds within 2 hours',
      propertiesManaged:  3,
    },
    blocks: [
      {
        id:    'prop-1-block-a',
        name:  'Block A',
        floor: 'Ground & 1st Floor',
        rooms: [
          {
            id:        'prop-1-block-a-room-1',
            number:    'A01',
            type:      'Single',
            price:     120000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-a-room-1'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'Gated Estate'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-a-room-2',
            number:    'A02',
            type:      'Single',
            price:     120000,
            status:    'Booked',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-a-room-2'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'Gated Estate'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-a-room-3',
            number:    'A03',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-a-room-3'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access', 'Laundry Area'],
            },
          },
          {
            id:        'prop-1-block-a-room-4',
            number:    'A04',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-a-room-4'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access', 'Laundry Area'],
            },
          },
          {
            id:        'prop-1-block-a-room-5',
            number:    'A05',
            type:      'Self-Contain',
            price:     180000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-a-room-5'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator', 'Prepaid Meter'],
              water:    ['Constant Water Supply', 'Overhead Tank'],
              internet: ['WiFi Included', 'Strong Network Coverage'],
              security: ['24hr Security', 'CCTV Cameras', 'Gated Estate'],
              extras:   ['Parking Space', 'Kitchen Access', 'Laundry Area'],
            },
          },
          {
            id:        'prop-1-block-a-room-6',
            number:    'A06',
            type:      'Self-Contain',
            price:     180000,
            status:    'Maintenance',
            floor:     '1st',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-a-room-6'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator', 'Prepaid Meter'],
              water:    ['Constant Water Supply', 'Overhead Tank'],
              internet: ['WiFi Included', 'Strong Network Coverage'],
              security: ['24hr Security', 'CCTV Cameras', 'Gated Estate'],
              extras:   ['Parking Space', 'Kitchen Access', 'Laundry Area'],
            },
          },
          {
            id:        'prop-1-block-a-room-7',
            number:    'A07',
            type:      'Single',
            price:     120000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-a-room-7'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'Gated Estate'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-a-room-8',
            number:    'A08',
            type:      'Single',
            price:     120000,
            status:    'Booked',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-a-room-8'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'Gated Estate'],
              extras:   ['Shared Kitchen Access'],
            },
          },
        ],
      },
      {
        id:    'prop-1-block-b',
        name:  'Block B',
        floor: 'Ground, 1st & 2nd Floor',
        rooms: [
          {
            id:        'prop-1-block-b-room-1',
            number:    'B01',
            type:      'Self-Contain',
            price:     180000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-b-room-1'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security', 'CCTV Cameras'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-b-room-2',
            number:    'B02',
            type:      'Self-Contain',
            price:     180000,
            status:    'Booked',
            floor:     'Ground',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-b-room-2'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security', 'CCTV Cameras'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-b-room-3',
            number:    'B03',
            type:      'Single',
            price:     120000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-b-room-3'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-b-room-4',
            number:    'B04',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-b-room-4'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access', 'Laundry Area'],
            },
          },
          {
            id:        'prop-1-block-b-room-5',
            number:    'B05',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     '2nd',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-b-room-5'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-b-room-6',
            number:    'B06',
            type:      'Single',
            price:     120000,
            status:    'Booked',
            floor:     '2nd',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-b-room-6'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
        ],
      },
      {
        id:    'prop-1-block-c',
        name:  'Block C',
        floor: 'Ground Floor Only',
        rooms: [
          {
            id:        'prop-1-block-c-room-1',
            number:    'C01',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-c-room-1'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-c-room-2',
            number:    'C02',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-c-room-2'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-c-room-3',
            number:    'C03',
            type:      'Single',
            price:     120000,
            status:    'Booked',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-c-room-3'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-c-room-4',
            number:    'C04',
            type:      'Self-Contain',
            price:     180000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-c-room-4'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator'],
              water:    ['Constant Water Supply', 'Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security', 'CCTV Cameras'],
              extras:   ['Kitchen Access', 'Laundry Area'],
            },
          },
        ],
      },
      {
        id:    'prop-1-block-d',
        name:  'Block D',
        floor: '1st & 2nd Floor',
        rooms: [
          {
            id:        'prop-1-block-d-room-1',
            number:    'D01',
            type:      'Single',
            price:     120000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-d-room-1'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-d-room-2',
            number:    'D02',
            type:      'Single',
            price:     120000,
            status:    'Maintenance',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-1-block-d-room-2'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-d-room-3',
            number:    'D03',
            type:      'Self-Contain',
            price:     180000,
            status:    'Booked',
            floor:     '2nd',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-d-room-3'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security', 'CCTV Cameras'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-d-room-4',
            number:    'D04',
            type:      'Self-Contain',
            price:     180000,
            status:    'Available',
            floor:     '2nd',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-1-block-d-room-4'),
            amenities: {
              power:    ['24hr Electricity', 'Backup Generator'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security', 'CCTV Cameras'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
          {
            id:        'prop-1-block-d-room-5',
            number:    'D05',
            type:      'Shared',
            price:     90000,
            status:    'Available',
            floor:     '2nd',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-1-block-d-room-5'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
        ],
      },
    ],
  },
  {
    id:               'prop-2',
    name:             'Greenfield Lodge',
    university:       'UNILAG',
    city:             'Lagos',
    address:          '12 Akoka Road, Yaba, Lagos',
    distanceToGate:   '3 mins walk',
    distanceToMarket: '5 mins walk',
    distanceToFaculty:'6 mins walk',
    totalRooms:       80,
    verified:         true,
    amenities:        ['Generator', 'Security', 'Parking', 'Borehole Water', 'CCTV'],
    gateImage:        GATE_IMAGES['prop-2'],
    rules: [
      'No loud music after 11pm',
      'Visitors must leave by 10pm',
      'No subletting allowed',
    ],
    landlord: {
      name:               'Mrs. Funke Adeyemi',
      verified:           true,
      responseTime:       'Usually responds within 4 hours',
      propertiesManaged:  2,
    },
    blocks: [
      {
        id:    'prop-2-block-a',
        name:  'Block A',
        floor: 'Ground & 1st Floor',
        rooms: [
          {
            id:        'prop-2-block-a-room-1',
            number:    'A01',
            type:      'Self-Contain',
            price:     200000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-2-block-a-room-1'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'CCTV Cameras', 'Gated Estate'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
          {
            id:        'prop-2-block-a-room-2',
            number:    'A02',
            type:      'Self-Contain',
            price:     200000,
            status:    'Booked',
            floor:     'Ground',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-2-block-a-room-2'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'CCTV Cameras', 'Gated Estate'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
          {
            id:        'prop-2-block-a-room-3',
            number:    'A03',
            type:      'Single',
            price:     150000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-2-block-a-room-3'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'Gated Estate'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-2-block-a-room-4',
            number:    'A04',
            type:      'Single',
            price:     150000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-2-block-a-room-4'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Overhead Tank'],
              internet: ['Strong Network Coverage'],
              security: ['24hr Security', 'Gated Estate'],
              extras:   ['Shared Kitchen Access'],
            },
          },
        ],
      },
      {
        id:    'prop-2-block-b',
        name:  'Block B',
        floor: 'Ground & 1st Floor',
        rooms: [
          {
            id:        'prop-2-block-b-room-1',
            number:    'B01',
            type:      'Single',
            price:     150000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-2-block-b-room-1'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-2-block-b-room-2',
            number:    'B02',
            type:      'Single',
            price:     150000,
            status:    'Booked',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-2-block-b-room-2'),
            amenities: {
              power:    ['Generator Backup'],
              water:    ['Constant Water Supply'],
              internet: ['WiFi Included'],
              security: ['24hr Security'],
              extras:   ['Shared Kitchen Access'],
            },
          },
          {
            id:        'prop-2-block-b-room-3',
            number:    'B03',
            type:      'Self-Contain',
            price:     220000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'En-suite',
            furnished: 'Yes',
            dimensions:'4m x 5m',
            images: roomImages('Self-Contain', 'prop-2-block-b-room-3'),
            amenities: {
              power:    ['Generator Backup', 'Prepaid Meter'],
              water:    ['Constant Water Supply', 'Overhead Tank'],
              internet: ['WiFi Included'],
              security: ['24hr Security', 'CCTV Cameras'],
              extras:   ['Parking Space', 'Kitchen Access'],
            },
          },
        ],
      },
    ],
  },
  {
    id:               'prop-3',
    name:             'Campus View Hostel',
    university:       'UNN',
    city:             'Enugu',
    address:          'University Road, Nsukka, Enugu',
    distanceToGate:   '8 mins walk',
    distanceToMarket: '12 mins walk',
    distanceToFaculty:'10 mins walk',
    totalRooms:       60,
    verified:         true,
    amenities:        ['Solar Power', 'WiFi', 'Borehole Water', 'Kitchen', 'Security'],
    gateImage:        GATE_IMAGES['prop-3'],
    rules: [
      'No loud noise after 10pm',
      'Keep common areas clean',
      'No pets allowed',
    ],
    landlord: {
      name:               'Mr. Chukwuemeka Eze',
      verified:           true,
      responseTime:       'Usually responds within 6 hours',
      propertiesManaged:  1,
    },
    blocks: [
      {
        id:    'prop-3-block-a',
        name:  'Block A',
        floor: 'Ground & 1st Floor',
        rooms: [
          {
            id:        'prop-3-block-a-room-1',
            number:    'A01',
            type:      'Shared',
            price:     75000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-3-block-a-room-1'),
            amenities: {
              power:    ['Solar Power', 'Generator Backup'],
              water:    ['Borehole Water'],
              internet: ['WiFi Included'],
              security: ['Security Guard'],
              extras:   ['Shared Kitchen', 'Laundry Area'],
            },
          },
          {
            id:        'prop-3-block-a-room-2',
            number:    'A02',
            type:      'Shared',
            price:     75000,
            status:    'Booked',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            images: roomImages('Shared', 'prop-3-block-a-room-2'),
            amenities: {
              power:    ['Solar Power', 'Generator Backup'],
              water:    ['Borehole Water'],
              internet: ['WiFi Included'],
              security: ['Security Guard'],
              extras:   ['Shared Kitchen', 'Laundry Area'],
            },
          },
          {
            id:        'prop-3-block-a-room-3',
            number:    'A03',
            type:      'Single',
            price:     110000,
            status:    'Available',
            floor:     '1st',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-3-block-a-room-3'),
            amenities: {
              power:    ['Solar Power'],
              water:    ['Borehole Water'],
              internet: ['WiFi Included'],
              security: ['Security Guard'],
              extras:   ['Shared Kitchen'],
            },
          },
        ],
      },
      {
        id:    'prop-3-block-b',
        name:  'Block B',
        floor: 'Ground Floor Only',
        rooms: [
          {
            id:        'prop-3-block-b-room-1',
            number:    'B01',
            type:      'Single',
            price:     110000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'3m x 4m',
            images: roomImages('Single', 'prop-3-block-b-room-1'),
            amenities: {
              power:    ['Solar Power', 'Generator Backup'],
              water:    ['Borehole Water'],
              internet: ['WiFi Included'],
              security: ['Security Guard'],
              extras:   ['Shared Kitchen'],
            },
          },
          {
            id:        'prop-3-block-b-room-2',
            number:    'B02',
            type:      'Shared',
            price:     75000,
            status:    'Available',
            floor:     'Ground',
            bathroom:  'Shared',
            furnished: 'No',
            dimensions:'4m x 4m',
            // Deliberately empty — demonstrates the graceful
            // no-images fallback path in RoomGallerySection.
            images: [],
            amenities: {
              power:    ['Solar Power'],
              water:    ['Borehole Water'],
              internet: ['WiFi Included'],
              security: ['Security Guard'],
              extras:   ['Shared Kitchen', 'Laundry Area'],
            },
          },
        ],
      },
    ],
  },
]

// ── HELPER FUNCTIONS ──────────────────────────────────────────
// These make it easy to look up data from anywhere in the app
// Import whichever helpers you need in each page

// Get a property by its id
export function getPropertyById(id) {
  return PROPERTIES.find((p) => p.id === id) || null
}

// Get a single room by its id — searches across ALL properties
// Returns both the room AND its parent property and block
export function getRoomById(roomId) {
  for (const property of PROPERTIES) {
    for (const block of property.blocks) {
      const room = block.rooms.find((r) => r.id === roomId)
      if (room) {
        return { room, block, property }
      }
    }
  }
  return null
}

// Returns just the images array for a given room — used by
// components that only need photos, not the full room record
export function getRoomImages(roomId) {
  const result = getRoomById(roomId)
  return result?.room.images || []
}

// Get all available rooms across all properties — used for stats
export function getAllAvailableRooms() {
  return PROPERTIES.flatMap((p) =>
    p.blocks.flatMap((b) =>
      b.rooms.filter((r) => r.status === 'Available').map((r) => ({
        ...r,
        propertyId:   p.id,
        propertyName: p.name,
        university:   p.university,
        city:         p.city,
        blockName:    b.name,
      }))
    )
  )
}

// Build the property summary used on the Search page
// Derives availableRooms, roomTypes, priceFrom, priceTo from real room data
export function getPropertySummaries() {
  return PROPERTIES.map((p) => {
    const allRooms      = p.blocks.flatMap((b) => b.rooms)
    const availableRooms = allRooms.filter((r) => r.status === 'Available').length
    const roomTypes     = [...new Set(allRooms.map((r) => r.type))]
    const prices        = allRooms.map((r) => r.price)
    const priceFrom     = Math.min(...prices)
    const priceTo       = Math.max(...prices)

    // First image found on any room in this property — used as the
    // property card thumbnail on the homepage and search results.
    const roomWithImages = allRooms.find((r) => r.images && r.images.length > 0)
    const thumbnail = roomWithImages ? roomWithImages.images[0] : null

    return {
      id:               p.id,
      name:             p.name,
      university:       p.university,
      city:             p.city,
      address:          p.address,
      distanceToGate:   p.distanceToGate,
      totalRooms:       allRooms.length,
      availableRooms,
      blocks:           p.blocks.map((b) => b.name),
      roomTypes,
      priceFrom,
      priceTo,
      verified:         p.verified,
      landlord:         p.landlord.name,
      amenities:        p.amenities,
      thumbnail,
      gateImage:        p.gateImage || null,
    }
  })
}

// Service fee rate used across booking flow pages
export const SERVICE_FEE_RATE = 0.07