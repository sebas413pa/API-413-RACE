# Imagen base
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar archivos de dependencias primero (para cache eficiente)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el resto del proyecto
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "app.js"]