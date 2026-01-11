module.exports = {
  apps: [
    {
      name: "journalist-discord-bot",
      script: "bot.js",
      cwd: "/root/journalist-discord-bot",
      env: {
        // Adicione aqui variáveis de ambiente se precisar
      },
      restart_delay: 5000, // espera 5s antes de reiniciar
      watch: false,        // true se quiser reiniciar ao mudar arquivos
    },
  ],
};
