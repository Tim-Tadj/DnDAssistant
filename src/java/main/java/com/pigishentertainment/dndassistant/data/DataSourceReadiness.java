package com.pigishentertainment.dndassistant.data;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Blocks the application context from starting until the database is
 * reachable. Without this, Spring's Hikari pool will give up after one
 * connection attempt and the JVM exits — which is a poor experience in
 * dev (when Postgres is still booting) and in production (when the DB
 * pod is restarting). Runs at HIGHEST_PRECEDENCE so it gates Flyway,
 * seeds, and any other data-source-dependent bean.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DataSourceReadiness implements BeanPostProcessor {

  private static final Logger log = LoggerFactory.getLogger(DataSourceReadiness.class);
  private static final int MAX_ATTEMPTS = 30;
  private static final long BACKOFF_MS = 1000L;

  @Override
  public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
    if (bean instanceof DataSource) {
      waitForConnection((DataSource) bean);
    }
    return bean;
  }

  private void waitForConnection(DataSource ds) {
    for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try (var c = ds.getConnection()) {
        if (c.isValid(2)) {
          if (attempt > 1) {
            log.info("DataSource ready after {} attempts", attempt);
          } else {
            log.info("DataSource ready on first attempt");
          }
          return;
        }
      } catch (Exception e) {
        log.warn("DataSource not ready (attempt {}/{}): {}",
            attempt, MAX_ATTEMPTS, e.getMessage());
      }
      try {
        Thread.sleep(BACKOFF_MS);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException("interrupted while waiting for DataSource", ie);
      }
    }
    throw new IllegalStateException(
        "DataSource did not become ready within " + MAX_ATTEMPTS + " attempts");
  }
}
