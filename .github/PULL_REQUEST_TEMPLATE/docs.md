# 📝 Actualización de Documentación

## 📋 Descripción
> Detalla qué documentación se actualizó o agregó.  
> (README, Wiki, Swagger/OpenAPI, comentarios de código, etc.)

---

## 📂 Áreas Afectadas
- [ ] `README.md`  
- [ ] Wiki / documentación externa  
- [ ] Comentarios en el código  
- [ ] Ejemplos o guías de uso  
- [ ] Documentación de API (Swagger / OpenAPI / Postman Collection)  
- [ ] Generación automática de docs (e.g., Redocly, SpringDoc, etc.)

---

## 🎯 Propósito
> Explica el motivo del cambio:
> - Nueva funcionalidad documentada  
> - Ajuste de endpoints o contratos  
> - Cambio en parámetros o respuestas  
> - Actualización de dependencias que afectan la documentación  

---

## 🔍 Cambios en Swagger / OpenAPI
> (Completa esta sección si aplica)

- [ ] Se agregaron nuevos endpoints  
- [ ] Se modificaron parámetros o modelos de respuesta  
- [ ] Se eliminaron endpoints obsoletos  
- [ ] Se actualizó la descripción general o metadatos (`title`, `version`, `servers`, etc.)

**Archivo/Ubicación:** `src/main/resources/swagger.yaml` (o la ruta donde esté tu doc)  
**Endpoint de Swagger:** `http://localhost:8080/swagger-ui.html`  

---

## 🧩 Herramientas / Scripts de Generación
> Indica si se regeneró documentación con herramientas automáticas

- [ ] `npm run generate-docs`
- [ ] `mvn clean compile` (SpringDoc)
- [ ] `redoc-cli build swagger.yaml`
- [ ] Otro: ____________________

---

## ✅ Checklist
- [ ] Ortografía y formato revisados  
- [ ] Ejemplos actualizados  
- [ ] Enlaces verificados  
- [ ] Información alineada con la versión actual del proyecto  
- [ ] Documentación Swagger generada sin errores (`yarn swagger:validate` o equivalente)