import { supabase, getTable } from '@/lib/supabaseClient';

// Entity helpers for Supabase
// Each entity provides methods to query Supabase tables

export const System = {
  findAll: () => getTable('systems').select('*'),
  findOne: (id) => getTable('systems').select('*').eq('id', id).single(),
  create: (data) => getTable('systems').insert(data),
  update: (id, data) => getTable('systems').update(data).eq('id', id),
  delete: (id) => getTable('systems').delete().eq('id', id)
};

export const Alert = {
  findAll: () => getTable('alerts').select('*'),
  findOne: (id) => getTable('alerts').select('*').eq('id', id).single(),
  create: (data) => getTable('alerts').insert(data),
  update: (id, data) => getTable('alerts').update(data).eq('id', id),
  delete: (id) => getTable('alerts').delete().eq('id', id)
};

export const Contractor = {
  findAll: () => getTable('contractors').select('*'),
  findOne: (id) => getTable('contractors').select('*').eq('id', id).single(),
  create: (data) => getTable('contractors').insert(data),
  update: (id, data) => getTable('contractors').update(data).eq('id', id),
  delete: (id) => getTable('contractors').delete().eq('id', id)
};

export const Meter = {
  findAll: () => getTable('meters').select('*'),
  findOne: (id) => getTable('meters').select('*').eq('id', id).single(),
  create: (data) => getTable('meters').insert(data),
  update: (id, data) => getTable('meters').update(data).eq('id', id),
  delete: (id) => getTable('meters').delete().eq('id', id)
};

export const Contract = {
  findAll: () => getTable('contracts').select('*'),
  findOne: (id) => getTable('contracts').select('*').eq('id', id).single(),
  create: (data) => getTable('contracts').insert(data),
  update: (id, data) => getTable('contracts').update(data).eq('id', id),
  delete: (id) => getTable('contracts').delete().eq('id', id)
};

export const STPOperation = {
  findAll: () => getTable('stp_operations').select('*'),
  findOne: (id) => getTable('stp_operations').select('*').eq('id', id).single(),
  create: (data) => getTable('stp_operations').insert(data),
  update: (id, data) => getTable('stp_operations').update(data).eq('id', id),
  delete: (id) => getTable('stp_operations').delete().eq('id', id)
};

export const WaterMeter = {
  findAll: () => getTable('water_meters').select('*'),
  findOne: (id) => getTable('water_meters').select('*').eq('id', id).single(),
  create: (data) => getTable('water_meters').insert(data),
  update: (id, data) => getTable('water_meters').update(data).eq('id', id),
  delete: (id) => getTable('water_meters').delete().eq('id', id)
};

export const FireSafetyEquipment = {
  findAll: () => getTable('fire_safety_equipment').select('*'),
  findOne: (id) => getTable('fire_safety_equipment').select('*').eq('id', id).single(),
  create: (data) => getTable('fire_safety_equipment').insert(data),
  update: (id, data) => getTable('fire_safety_equipment').update(data).eq('id', id),
  delete: (id) => getTable('fire_safety_equipment').delete().eq('id', id)
};

export const HvacMaintenanceLog = {
  findAll: () => getTable('hvac_maintenance_logs').select('*'),
  findOne: (id) => getTable('hvac_maintenance_logs').select('*').eq('id', id).single(),
  create: (data) => getTable('hvac_maintenance_logs').insert(data),
  update: (id, data) => getTable('hvac_maintenance_logs').update(data).eq('id', id),
  delete: (id) => getTable('hvac_maintenance_logs').delete().eq('id', id)
};

export const DailyWaterReading = {
  findAll: () => getTable('daily_water_readings').select('*'),
  findOne: (id) => getTable('daily_water_readings').select('*').eq('id', id).single(),
  create: (data) => getTable('daily_water_readings').insert(data),
  update: (id, data) => getTable('daily_water_readings').update(data).eq('id', id),
  delete: (id) => getTable('daily_water_readings').delete().eq('id', id)
};

export const MaintenanceSchedule = {
  findAll: () => getTable('maintenance_schedules').select('*'),
  findOne: (id) => getTable('maintenance_schedules').select('*').eq('id', id).single(),
  create: (data) => getTable('maintenance_schedules').insert(data),
  update: (id, data) => getTable('maintenance_schedules').update(data).eq('id', id),
  delete: (id) => getTable('maintenance_schedules').delete().eq('id', id)
};

export const MaintenanceHistory = {
  findAll: () => getTable('maintenance_history').select('*'),
  findOne: (id) => getTable('maintenance_history').select('*').eq('id', id).single(),
  create: (data) => getTable('maintenance_history').insert(data),
  update: (id, data) => getTable('maintenance_history').update(data).eq('id', id),
  delete: (id) => getTable('maintenance_history').delete().eq('id', id)
};

// Auth helpers using Supabase Auth
export const User = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser(),
  getSession: () => supabase.auth.getSession()
};
