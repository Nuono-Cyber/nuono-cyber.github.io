#!/bin/bash

# Script para instalar dependências opcionais do projeto

echo "Instalando suporte a arquivos XLSX..."
npm install xlsx @types/xlsx

echo "Dependências instaladas com sucesso!"
echo "Agora você pode usar o upload de arquivos XLSX no dashboard."