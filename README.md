# API-413-RACE
API para ecommerce de automotriz, escalable para implementar un CRM
---
## 👨‍💻 Autores

| Nombre              | Rol               | GitHub                                                                 |
|---------------------|------------------|------------------------------------------------------------------------|
| Sebastián Rocop     | Backend Developer | [sebas413pa](https://github.com/sebas413pa)                           |
| Constanza Cifuentes | Backend Developer | [ConstanzaCif](https://github.com/ConstanzaCif)                       |
| Jose Lopez          | Frontend Developer | [JoseLopez1923](https://github.com/JoseLopez1923)                     |


## Requisitos
- Una base de datos **MYSQL** (local o en Docker
- [Node.js](https://nodejs.org/) >= 18
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/)


---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# === ENTORNO ===
NODE_ENV=development
PROTOCOL=http
HOST=localhost
PORT=3000
API_PREFIX=api

# === BASE DE DATOS ===
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=db_ddriss
DB_NAME_TEST=
DB_NAME_PROD=

# === LOGS Y DEBUG ===
LOG_LEVEL=debug                         # niveles: error, warn, info, debug

# === CORS ===
CORS_ORIGIN=

# === APP CONFIG ===
APP_NAME=413_race
APP_VERSION=0.0.1
````
---
## Bases de Datos
Para inicializar la base de datos, ejecute el script ubicado en la carpeta SQL llamado `V1.0__init_schema` en una base de datos llamada 413_race. Puede crear la base de datos y ejecutar el script con los siguientes comandos:
````sql
CREATE DATABASE 413_race;
USE db_ddriss;
SOURCE ruta/al/archivo/script.sql;
````


## Proceso de instalación y ejecución
````
- git clone https://github.com/sebas413pa/API-413-RACE.git
- cd API-413-RACE
- npm install
- npm run dev
````  
