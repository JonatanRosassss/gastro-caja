# PRODUCT.md — Caja & Cocina

## Summary
Sistema de caja diaria por tandas, costeo flexible de recetas gastronómicas y control de gastos compartidos para un emprendimiento gastronómico familiar (gestionado entre dos hermanos, con un empleado por turnos llamado Sever y gastos compartidos de alquiler y luz con la iglesia de sus padres).

## Users & Context
- **Operadores:** Dos hermanos trabajando en cocina y despacho desde el celular o PC.
- **Ritmo de uso:** Carga de ventas por tandas cada ~2 horas o al cierre del día; registro inmediato de compras de mercadería con variación frecuente de precios; liquidación del turno de Sever (martes, viernes, sábado y domingo entre $3.000/h y $4.500/h según nivel de ventas en torno a los $100.000 diarios); seguimiento mensual de aportes variables de alquiler ($800.000 total real), luz ($270.000 total real) y ofrendas semanales (~$40.000).

## Core Jobs
1. **Anotar tanda de ventas en menos de 10 segundos** congelando el costo de mercadería de ese día.
2. **Separar la plata en tres cuentas claras:** Caja Bruta, Fondo de Reposición de Mercadería (intocable) y Ganancia Libre Real.
3. **Actualizar precios de insumos variables** (muzzarella, carne, milanesa, bondiola, papas, bebidas) y recalcular automáticamente el margen de cada pizza, sánguche, empanada o bebida.
4. **Calcular y registrar el pago por hora a Sever** según la venta del día y controlar el progreso de aportes a la iglesia (alquiler, luz y ofrendas).
5. **Consultar diagnóstico financiero y simulador de cuotas** con motor analítico local o API de Gemini.
