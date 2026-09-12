import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app/app.module.js";
import type { Environment } from "./config/environment.js";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
	const config = app.get(ConfigService<Environment, true>);
	app.enableCors({
		credentials: true,
		origin: config.get("WEB_ORIGIN", { infer: true }),
	});
	app.enableShutdownHooks();
	app.useGlobalPipes(
		new ValidationPipe({
			forbidNonWhitelisted: true,
			transform: true,
			whitelist: true,
		}),
	);

	const openApiConfig = new DocumentBuilder().setTitle("LATCH API").setDescription("ENS-backed agent authorization and confidential policy orchestration").setVersion("0.1.0").addBearerAuth().build();
	SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, openApiConfig));

	const port = config.get("PORT", { infer: true });
	await app.listen({ host: "0.0.0.0", port });
	Logger.log(`LATCH API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
