# Etapa 1: Construcción de la aplicación Angular
FROM node:18 AS build

# Definir el directorio de trabajo
WORKDIR /app

# Copiar los archivos del proyecto Angular
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src

# Instalar las dependencias
RUN npm install

# Construir la aplicación para producción
RUN npm run build --prod

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:alpine

# Copiar los archivos de la construcción al directorio de Nginx
COPY --from=build /app/dist/<nombre-de-tu-app> /usr/share/nginx/html

# Exponer el puerto 80 para que Nginx lo use
EXPOSE 80

# Iniciar el servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
