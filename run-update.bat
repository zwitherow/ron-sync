@echo off
git pull
git reset --hard origin/master
npm i && npm run build
