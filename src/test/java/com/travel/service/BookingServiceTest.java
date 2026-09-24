package com.travel.service;

import com.travel.entity.Booking;
import com.travel.entity.TravelPackage;
import com.travel.entity.User;
import com.travel.repository.BookingRepository;
import com.travel.repository.TravelPackageRepository;
import com.travel.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {
    @Mock UserRepository users;
    @Mock TravelPackageRepository packages;
    @Mock BookingRepository bookings;
    @InjectMocks BookingService service;

    private TravelPackage pkg(int seats) {
        TravelPackage p = new TravelPackage();
        p.setId(1L);
        p.setPrice(new BigDecimal("100"));
        p.setStartDate(LocalDate.now().plusDays(10));
        p.setAvailableSeats(seats);
        return p;
    }

    @Test
    void booking_reducesSeats_andComputesTotal() {
        TravelPackage p = pkg(5);
        when(users.findByEmail("a@b.com")).thenReturn(Optional.of(new User()));
        when(packages.findForUpdate(1L)).thenReturn(Optional.of(p));
        when(bookings.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        Booking b = service.book("a@b.com", 1L, 2);

        assertEquals(3, p.getAvailableSeats());
        assertEquals(new BigDecimal("200"), b.getTotalPrice());
    }

    @Test
    void overbooking_isRejected() {
        when(users.findByEmail(any())).thenReturn(Optional.of(new User()));
        when(packages.findForUpdate(1L)).thenReturn(Optional.of(pkg(1)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.book("a@b.com", 1L, 2));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(bookings, never()).save(any());
    }
}
