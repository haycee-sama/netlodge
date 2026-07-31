'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { MapPin, GraduationCap } from 'lucide-react'

export default function CityCoverageGrid({ cities }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1 } } }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-6"
    >
      {cities.map((city) => (
        <motion.div
          key={city.name}
          variants={{
            hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
          className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:bg-orange-50 hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center transition-colors">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{city.name}</h3>
              <p className="text-sm text-orange-500 font-medium">{city.rooms} rooms</p>
            </div>
          </div>

          <ul className="flex flex-col gap-1 mb-4">
            {city.universities.map((uni) => (
              <li key={uni} className="text-sm text-gray-500 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                {uni}
              </li>
            ))}
          </ul>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Rooms available now</span>
              <span className="font-semibold text-gray-700">{city.coveragePercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${city.coveragePercent}%` }}
                viewport={{ once: true }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: 'easeOut' }}
                className="h-full bg-orange-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}