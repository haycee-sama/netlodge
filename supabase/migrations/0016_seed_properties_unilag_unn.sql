-- ===========================================================================
-- NetLodge Schema Migration — Part 16: Seed Properties for UNILAG + UNN
-- ===========================================================================
-- Creates sample verified properties with rooms, floors, facilities, and
-- images for University of Lagos (UNILAG) and University of Nigeria, Nsukka
-- (UNN) so the marketplace is not empty after a fresh database reset.
--
-- Properties are owned by landlord.test@netlodge.test and are marked as
-- verified + approved so they appear in public search.
--
-- This migration is idempotent — it checks if properties with these slugs
-- already exist before inserting.
-- ===========================================================================

-- Get the landlord test account ID
DO $$
DECLARE
  v_landlord_id uuid;
  v_unilag_id uuid;
  v_unn_id uuid;
  v_akoka_id uuid;
  v_bariga_id uuid;
  v_yaba_id uuid;
  v_nsukka_town_id uuid;
  v_floor_id uuid;
  v_prop_id uuid;
BEGIN
  -- Find the landlord test account
  SELECT id INTO v_landlord_id FROM public.profiles WHERE email = 'landlord.test@netlodge.test' LIMIT 1;
  IF v_landlord_id IS NULL THEN
    RAISE NOTICE 'landlord.test@netlodge.test not found — skipping property seed';
    RETURN;
  END IF;

  -- Find university IDs
  SELECT id INTO v_unilag_id FROM public.universities WHERE slug = 'university-of-lagos' LIMIT 1;
  SELECT id INTO v_unn_id FROM public.universities WHERE slug = 'university-of-nigeria-nsukka' LIMIT 1;

  -- Find neighbourhood IDs
  SELECT id INTO v_akoka_id FROM public.neighbourhoods WHERE slug = 'akoka' LIMIT 1;
  SELECT id INTO v_bariga_id FROM public.neighbourhoods WHERE slug = 'bariga' LIMIT 1;
  SELECT id INTO v_yaba_id FROM public.neighbourhoods WHERE slug = 'yaba' LIMIT 1;
  SELECT id INTO v_nsukka_town_id FROM public.neighbourhoods WHERE slug = 'nsukka-town' LIMIT 1;

  -- =========================================================================
  -- UNILAG Property 1: Akoka Heights Hostel
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = 'akoka-heights-hostel') THEN
    INSERT INTO public.properties (
      landlord_id, name, slug, type, status, verification_status,
      university_id, neighbourhood_id,
      public_address_line, private_address_line, city, state,
      latitude, longitude,
      total_floors, total_units, available_units, occupied_units, held_units,
      price_from_kobo, description
    ) VALUES (
      v_landlord_id, 'Akoka Heights Hostel', 'akoka-heights-hostel',
      'self_contain_block', 'verified', 'approved',
      v_unilag_id, v_akoka_id,
      '14 Akoka Road, Akoka', '14 Akoka Road, Akoka, Yaba, Lagos',
      'Lagos', 'Lagos',
      6.5158, 3.3898,
      3, 12, 8, 4, 0,
      45000000,  -- ₦450,000/yr
      'A modern self-contain hostel block 8 minutes'' walk from UNILAG Akoka campus gate. Each unit comes with a private bathroom, kitchenette, and study desk. 24/7 security, backup power, and reliable water supply.'
    ) RETURNING id INTO v_prop_id;

    -- Add facilities
    INSERT INTO public.property_facilities (property_id, facility) VALUES
      (v_prop_id, 'wifi'), (v_prop_id, 'power_backup'), (v_prop_id, 'water_borehole'),
      (v_prop_id, 'cctv'), (v_prop_id, 'security_guard'), (v_prop_id, 'parking'),
      (v_prop_id, 'generator'), (v_prop_id, 'solar_power')
    ON CONFLICT DO NOTHING;

    -- Add a floor
    INSERT INTO public.floors (property_id, label, level, default_price_kobo)
    VALUES (v_prop_id, 'Ground Floor', 0, 45000000)
    RETURNING id INTO v_floor_id;

    -- Add rooms
    INSERT INTO public.rentable_units (property_id, floor_id, identifier, slug, unit_type, status, capacity, bedrooms, bathrooms, has_window, furnishing, annual_rent_kobo, rental_period, available_from) VALUES
      (v_prop_id, v_floor_id, 'A-101', 'akoka-heights-a-101', 'self_contain', 'available', 1, 0, 1, true, 'fully_furnished', 45000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'A-102', 'akoka-heights-a-102', 'self_contain', 'available', 1, 0, 1, true, 'fully_furnished', 45000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'A-103', 'akoka-heights-a-103', 'self_contain', 'available', 1, 0, 1, false, 'semi_furnished', 42000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'A-104', 'akoka-heights-a-104', 'self_contain', 'occupied', 1, 0, 1, true, 'fully_furnished', 45000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'A-105', 'akoka-heights-a-105', 'self_contain', 'available', 1, 0, 1, true, 'fully_furnished', 48000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'A-106', 'akoka-heights-a-106', 'self_contain', 'available', 1, 0, 1, true, 'semi_furnished', 43000000, 'annual', '2026-01-01');

    -- Add property image
    INSERT INTO public.property_images (property_id, public_url, storage_path, alt_text, position) VALUES
      (v_prop_id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&auto=format&fit=crop', 'seed/akoka-heights-1.jpg', 'Modern student hostel exterior with clean white walls', 0),
      (v_prop_id, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80&auto=format&fit=crop', 'seed/akoka-heights-2.jpg', 'Self-contain room with desk, chair and neatly made bed', 1)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Akoka Heights Hostel with 6 rooms';
  END IF;

  -- =========================================================================
  -- UNILAG Property 2: Bariga Gardens
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = 'bariga-gardens') THEN
    INSERT INTO public.properties (
      landlord_id, name, slug, type, status, verification_status,
      university_id, neighbourhood_id,
      public_address_line, private_address_line, city, state,
      latitude, longitude,
      total_floors, total_units, available_units, occupied_units, held_units,
      price_from_kobo, description
    ) VALUES (
      v_landlord_id, 'Bariga Gardens', 'bariga-gardens',
      'shared_house', 'verified', 'approved',
      v_unilag_id, v_bariga_id,
      '7 Bariga Way, Bariga', '7 Bariga Way, Bariga, Lagos',
      'Lagos', 'Lagos',
      6.5300, 3.3810,
      2, 8, 5, 3, 0,
      35000000,  -- ₦350,000/yr
      'A quieter alternative to Akoka, Bariga Gardens offers shared and single rooms in a fenced compound with ample parking. 15 minutes'' walk to UNILAG second gate.'
    ) RETURNING id INTO v_prop_id;

    INSERT INTO public.property_facilities (property_id, facility) VALUES
      (v_prop_id, 'wifi'), (v_prop_id, 'power_backup'), (v_prop_id, 'water_borehole'),
      (v_prop_id, 'security_guard'), (v_prop_id, 'parking'), (v_prop_id, 'kitchen_shared'),
      (v_prop_id, 'generator'), (v_prop_id, 'waste_disposal')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.floors (property_id, label, level, default_price_kobo)
    VALUES (v_prop_id, 'Ground Floor', 0, 35000000)
    RETURNING id INTO v_floor_id;

    INSERT INTO public.rentable_units (property_id, floor_id, identifier, slug, unit_type, status, capacity, bedrooms, bathrooms, has_window, furnishing, annual_rent_kobo, rental_period, available_from) VALUES
      (v_prop_id, v_floor_id, 'BG-01', 'bariga-gardens-bg-01', 'single_room', 'available', 1, 0, 0, true, 'semi_furnished', 35000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'BG-02', 'bariga-gardens-bg-02', 'single_room', 'available', 1, 0, 0, true, 'semi_furnished', 35000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'BG-03', 'bariga-gardens-bg-03', 'single_room', 'occupied', 1, 0, 0, false, 'semi_furnished', 35000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'BG-04', 'bariga-gardens-bg-04', 'shared_room', 'available', 2, 0, 0, true, 'semi_furnished', 28000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'BG-05', 'bariga-gardens-bg-05', 'shared_room', 'available', 2, 0, 0, true, 'semi_furnished', 28000000, 'annual', '2026-01-01');

    INSERT INTO public.property_images (property_id, public_url, storage_path, alt_text, position) VALUES
      (v_prop_id, 'https://images.unsplash.com/photo-1560448204-e02f11c3d4e0?w=1200&q=80&auto=format&fit=crop', 'seed/bariga-gardens-1.jpg', 'Fenced student compound with garden area', 0)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Bariga Gardens with 5 rooms';
  END IF;

  -- =========================================================================
  -- UNILAG Property 3: Yaba Studios
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = 'yaba-studios') THEN
    INSERT INTO public.properties (
      landlord_id, name, slug, type, status, verification_status,
      university_id, neighbourhood_id,
      public_address_line, private_address_line, city, state,
      latitude, longitude,
      total_floors, total_units, available_units, occupied_units, held_units,
      price_from_kobo, description
    ) VALUES (
      v_landlord_id, 'Yaba Studios', 'yaba-studios',
      'apartment_building', 'verified', 'approved',
      v_unilag_id, v_yaba_id,
      '23 Herbert Macaulay Way, Yaba', '23 Herbert Macaulay Way, Yaba, Lagos',
      'Lagos', 'Lagos',
      6.4870, 3.3760,
      4, 16, 10, 6, 0,
      65000000,  -- ₦650,000/yr
      'Premium studio apartments in the heart of Yaba. Each studio has a private kitchen, bathroom, and balcony. Walking distance to UNILAG and Yabatech. High-speed Wi-Fi included.'
    ) RETURNING id INTO v_prop_id;

    INSERT INTO public.property_facilities (property_id, facility) VALUES
      (v_prop_id, 'wifi'), (v_prop_id, 'power_backup'), (v_prop_id, 'water_borehole'),
      (v_prop_id, 'cctv'), (v_prop_id, 'security_guard'), (v_prop_id, 'parking'),
      (v_prop_id, 'kitchen_private'), (v_prop_id, 'laundry'), (v_prop_id, 'generator'),
      (v_prop_id, 'solar_power'), (v_prop_id, 'ac'), (v_prop_id, 'balcony')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.floors (property_id, label, level, default_price_kobo)
    VALUES (v_prop_id, 'First Floor', 1, 65000000)
    RETURNING id INTO v_floor_id;

    INSERT INTO public.rentable_units (property_id, floor_id, identifier, slug, unit_type, status, capacity, bedrooms, bathrooms, has_window, furnishing, annual_rent_kobo, rental_period, available_from) VALUES
      (v_prop_id, v_floor_id, 'YS-101', 'yaba-studios-ys-101', 'studio', 'available', 1, 0, 1, true, 'fully_furnished', 65000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'YS-102', 'yaba-studios-ys-102', 'studio', 'available', 1, 0, 1, true, 'fully_furnished', 65000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'YS-103', 'yaba-studios-ys-103', 'studio', 'available', 1, 0, 1, true, 'fully_furnished', 70000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'YS-104', 'yaba-studios-ys-104', 'studio', 'occupied', 1, 0, 1, true, 'fully_furnished', 65000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'YS-105', 'yaba-studios-ys-105', 'studio', 'available', 1, 0, 1, true, 'fully_furnished', 68000000, 'annual', '2026-01-01');

    INSERT INTO public.property_images (property_id, public_url, storage_path, alt_text, position) VALUES
      (v_prop_id, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop', 'seed/yaba-studios-1.jpg', 'Modern apartment building exterior', 0),
      (v_prop_id, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80&auto=format&fit=crop', 'seed/yaba-studios-2.jpg', 'Studio apartment with kitchen and living area', 1)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Yaba Studios with 5 rooms';
  END IF;

  -- =========================================================================
  -- UNN Property 1: Nsukka Town Lodge
  -- =========================================================================
  IF v_unn_id IS NOT NULL AND v_nsukka_town_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = 'nsukka-town-lodge') THEN
    INSERT INTO public.properties (
      landlord_id, name, slug, type, status, verification_status,
      university_id, neighbourhood_id,
      public_address_line, private_address_line, city, state,
      latitude, longitude,
      total_floors, total_units, available_units, occupied_units, held_units,
      price_from_kobo, description
    ) VALUES (
      v_landlord_id, 'Nsukka Town Lodge', 'nsukka-town-lodge',
      'self_contain_block', 'verified', 'approved',
      v_unn_id, v_nsukka_town_id,
      '12 Market Road, Nsukka', '12 Market Road, Nsukka Town, Enugu',
      'Nsukka', 'Enugu',
      6.8567, 7.3956,
      2, 10, 7, 3, 0,
      32000000,  -- ₦320,000/yr
      'Affordable self-contain units in Nsukka Town, 12 minutes'' walk to UNN campus gate. Quiet neighbourhood with good road access. Each unit has a private bathroom and kitchenette.'
    ) RETURNING id INTO v_prop_id;

    INSERT INTO public.property_facilities (property_id, facility) VALUES
      (v_prop_id, 'wifi'), (v_prop_id, 'power_backup'), (v_prop_id, 'water_borehole'),
      (v_prop_id, 'security_guard'), (v_prop_id, 'parking'), (v_prop_id, 'generator'),
      (v_prop_id, 'waste_disposal')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.floors (property_id, label, level, default_price_kobo)
    VALUES (v_prop_id, 'Ground Floor', 0, 32000000)
    RETURNING id INTO v_floor_id;

    INSERT INTO public.rentable_units (property_id, floor_id, identifier, slug, unit_type, status, capacity, bedrooms, bathrooms, has_window, furnishing, annual_rent_kobo, rental_period, available_from) VALUES
      (v_prop_id, v_floor_id, 'NT-01', 'nsukka-town-lodge-nt-01', 'self_contain', 'available', 1, 0, 1, true, 'semi_furnished', 32000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'NT-02', 'nsukka-town-lodge-nt-02', 'self_contain', 'available', 1, 0, 1, true, 'semi_furnished', 32000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'NT-03', 'nsukka-town-lodge-nt-03', 'self_contain', 'available', 1, 0, 1, false, 'semi_furnished', 30000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'NT-04', 'nsukka-town-lodge-nt-04', 'self_contain', 'occupied', 1, 0, 1, true, 'semi_furnished', 32000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'NT-05', 'nsukka-town-lodge-nt-05', 'self_contain', 'available', 1, 0, 1, true, 'fully_furnished', 35000000, 'annual', '2026-01-01');

    INSERT INTO public.property_images (property_id, public_url, storage_path, alt_text, position) VALUES
      (v_prop_id, 'https://images.unsplash.com/photo-1486304873000-235205935bca?w=1200&q=80&auto=format&fit=crop', 'seed/nsukka-lodge-1.jpg', 'Student lodge building in Nsukka', 0)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Nsukka Town Lodge with 5 rooms';
  END IF;

  -- =========================================================================
  -- UNN Property 2: Lions' Den Hostel
  -- ===========================================================================
  IF v_unn_id IS NOT NULL AND v_nsukka_town_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.properties WHERE slug = 'lions-den-hostel') THEN
    INSERT INTO public.properties (
      landlord_id, name, slug, type, status, verification_status,
      university_id, neighbourhood_id,
      public_address_line, private_address_line, city, state,
      latitude, longitude,
      total_floors, total_units, available_units, occupied_units, held_units,
      price_from_kobo, description
    ) VALUES (
      v_landlord_id, 'Lions'' Den Hostel', 'lions-den-hostel',
      'shared_house', 'verified', 'approved',
      v_unn_id, v_nsukka_town_id,
      '5 UNN Road, Nsukka', '5 UNN Road, Nsukka Town, Enugu',
      'Nsukka', 'Enugu',
      6.8600, 7.3900,
      1, 6, 4, 2, 0,
      28000000,  -- ₦280,000/yr
      'Budget-friendly shared rooms popular with UNN freshmen. 5 minutes'' walk to the campus gate. Shared kitchen, common room, and study area. Generator runs every evening.'
    ) RETURNING id INTO v_prop_id;

    INSERT INTO public.property_facilities (property_id, facility) VALUES
      (v_prop_id, 'wifi'), (v_prop_id, 'power_backup'), (v_prop_id, 'water_borehole'),
      (v_prop_id, 'security_guard'), (v_prop_id, 'kitchen_shared'),
      (v_prop_id, 'common_room'), (v_prop_id, 'study_room'), (v_prop_id, 'generator')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.floors (property_id, label, level, default_price_kobo)
    VALUES (v_prop_id, 'Ground Floor', 0, 28000000)
    RETURNING id INTO v_floor_id;

    INSERT INTO public.rentable_units (property_id, floor_id, identifier, slug, unit_type, status, capacity, bedrooms, bathrooms, has_window, furnishing, annual_rent_kobo, rental_period, available_from) VALUES
      (v_prop_id, v_floor_id, 'LD-01', 'lions-den-hostel-ld-01', 'shared_room', 'available', 2, 0, 0, true, 'semi_furnished', 28000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'LD-02', 'lions-den-hostel-ld-02', 'shared_room', 'available', 2, 0, 0, true, 'semi_furnished', 28000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'LD-03', 'lions-den-hostel-ld-03', 'single_room', 'available', 1, 0, 0, false, 'semi_furnished', 25000000, 'annual', '2026-01-01'),
      (v_prop_id, v_floor_id, 'LD-04', 'lions-den-hostel-ld-04', 'single_room', 'occupied', 1, 0, 0, true, 'semi_furnished', 25000000, 'annual', '2026-01-01');

    INSERT INTO public.property_images (property_id, public_url, storage_path, alt_text, position) VALUES
      (v_prop_id, 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80&auto=format&fit=crop', 'seed/lions-den-1.jpg', 'Shared student room with bunk beds and study desks', 0)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Lions'' Den Hostel with 4 rooms';
  END IF;

END $$;
